"""
Alternative scraping implementation using Playwright MCP (JSON-RPC over stdio).

This does EXACTLY the same job as POST /scrape in backend/app/main.py,
but instead of calling the Playwright Python library directly, it spawns
the Playwright MCP server as a subprocess and drives it over JSON-RPC 2.0.

WHY the direct API (current backend) is better for a production service:
  - No subprocess spawn overhead on every scrape request
  - No JSON serialization/deserialization roundtrip
  - Exceptions propagate naturally (no error-code parsing)
  - MCP was designed for AI agents, not service-to-service use

WHEN the MCP approach makes sense:
  - You want a language-agnostic scraper other services can reuse
  - You're building an agentic workflow where an LLM decides when to scrape
  - You want to reuse the same MCP server VS Code Copilot already uses

Usage (standalone, outside Docker):
    pip install playwright
    python tools/scrape_via_mcp.py --url https://example.com

Contrast with backend/app/main.py POST /scrape which uses async_playwright() directly.
"""

import asyncio
import json
import pathlib
import argparse
import tempfile
import os
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Minimal MCP client — identical transport layer to explore_website_via_skill.py
# ---------------------------------------------------------------------------

@dataclass
class MCPClient:
    """Drives the Playwright MCP server over stdin/stdout JSON-RPC 2.0."""
    command: list[str]
    _proc: Any = field(default=None, init=False, repr=False)
    _req_id: int = field(default=0, init=False, repr=False)

    async def start(self) -> None:
        self._proc = await asyncio.create_subprocess_exec(
            *self.command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await self._rpc("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "scrape-mcp-demo", "version": "0.1.0"},
        })
        await self._notify("notifications/initialized", {})

    async def stop(self) -> None:
        if self._proc:
            self._proc.stdin.close()
            await self._proc.wait()

    async def call(self, tool: str, args: dict) -> dict:
        result = await self._rpc("tools/call", {"name": tool, "arguments": args})
        return result

    async def _rpc(self, method: str, params: dict) -> dict:
        self._req_id += 1
        await self._write({"jsonrpc": "2.0", "id": self._req_id, "method": method, "params": params})
        return await self._read(self._req_id)

    async def _notify(self, method: str, params: dict) -> None:
        await self._write({"jsonrpc": "2.0", "method": method, "params": params})

    async def _write(self, obj: dict) -> None:
        self._proc.stdin.write((json.dumps(obj) + "\n").encode())
        await self._proc.stdin.drain()

    async def _read(self, expected_id: int) -> dict:
        while True:
            line = await self._proc.stdout.readline()
            if not line:
                raise RuntimeError("MCP server closed unexpectedly")
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            if msg.get("id") == expected_id:
                if "error" in msg:
                    raise RuntimeError(f"MCP error {msg['error']}")
                return msg.get("result", {})


# ---------------------------------------------------------------------------
# Scraper — same logic as backend/app/main.py POST /scrape
# ---------------------------------------------------------------------------

async def scrape_url_via_mcp(url: str) -> dict:
    """
    Scrape a URL using Playwright MCP and return the same shape of data
    that backend/app/main.py's POST /scrape endpoint produces.

    Steps (mirrors the direct-API version):
      1. Navigate to the URL  (browser_navigate)
      2. Wait for JS to settle  (browser_wait_for)
      3. Extract page title  (browser_evaluate)
      4. Extract body text  (browser_evaluate)
      5. Save as PDF  (browser_pdf_save)  ← MCP exposes this tool
      6. Close browser  (browser_close)
      7. Return { title, text, pdf_path }
    """
    mcp = MCPClient(command=["npx", "@playwright/mcp@latest", "--browser", "chromium"])

    print(f"[MCP] Starting Playwright MCP server...")
    await mcp.start()

    try:
        # Step 1: Navigate
        print(f"[MCP] Navigating to {url}")
        await mcp.call("browser_navigate", {"url": url})

        # Step 2: Wait for content to settle (equivalent to wait_until="domcontentloaded" + 2s)
        await mcp.call("browser_wait_for", {"time": 2})

        # Step 3: Get page title
        title_result = await mcp.call("browser_evaluate", {
            "function": "() => document.title || document.querySelector('h1')?.innerText || 'Untitled'"
        })
        title = _extract_text(title_result) or "Untitled"
        page_title = f"[Web] {title}"

        # Step 4: Extract body text (same JS as the direct-API version)
        text_result = await mcp.call("browser_evaluate", {
            "function": "() => document.body.innerText"
        })
        page_text = _extract_text(text_result)

        # Step 5: Save as PDF to a temp file
        pdf_path = tempfile.mktemp(suffix=".pdf")
        await mcp.call("browser_pdf_save", {"filename": pdf_path})

        # Step 6: Close browser
        await mcp.call("browser_close", {})

        print(f"[MCP] Scraped '{page_title}' — {len(page_text)} chars, PDF at {pdf_path}")
        return {
            "title": page_title,
            "text": page_text,
            "pdf_path": pdf_path,
            "char_count": len(page_text),
        }

    finally:
        await mcp.stop()
        # Note: caller is responsible for deleting pdf_path after use


# ---------------------------------------------------------------------------
# Side-by-side comparison of what each approach does at the code level
# ---------------------------------------------------------------------------

COMPARISON = """
╔══════════════════════════════════════════════════════════════════════════════╗
║              Direct Playwright API  vs  Playwright MCP (this file)          ║
╠══════════════════════════════════╦═════════════════════════════════════════╣
║ backend/app/main.py              ║ tools/scrape_via_mcp.py                 ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ from playwright.async_api import ║ Spawns:                                 ║
║   async_playwright               ║   npx @playwright/mcp@latest            ║
║                                  ║   --browser chromium                    ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ async with async_playwright()    ║ MCPClient._rpc("initialize", ...)       ║
║   as p:                          ║                                         ║
║   browser = await                ║ (browser lifecycle managed by MCP       ║
║     p.chromium.launch(...)       ║  server process, not your code)         ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ await page.goto(url,             ║ await mcp.call("browser_navigate",      ║
║   wait_until="domcontentloaded") ║   {"url": url})                         ║
║ await page.wait_for_timeout(2000)║ await mcp.call("browser_wait_for",      ║
║                                  ║   {"time": 2})                          ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ text = await page.evaluate(      ║ await mcp.call("browser_evaluate",      ║
║   "() => document.body          ║   {"function": "() => document.body     ║
║    .innerText")                  ║    .innerText"})                         ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ await page.pdf(path=pdf_path)    ║ await mcp.call("browser_pdf_save",      ║
║                                  ║   {"filename": pdf_path})               ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ await browser.close()            ║ await mcp.call("browser_close", {})     ║
╠══════════════════════════════════╬═════════════════════════════════════════╣
║ VERDICT: USE THIS for production ║ Use this for: agent workflows,          ║
║ FastAPI endpoints. Lower         ║ language-agnostic pipelines, or when    ║
║ overhead, simpler error handling ║ the MCP server is already running       ║
║ direct control.                  ║ (shared with VS Code / other agents).   ║
╚══════════════════════════════════╩═════════════════════════════════════════╝
"""


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main(url: str) -> None:
    print(COMPARISON)
    result = await scrape_url_via_mcp(url)
    print("\n=== RESULT ===")
    print(f"  Title     : {result['title']}")
    print(f"  Text size : {result['char_count']} chars")
    print(f"  PDF path  : {result['pdf_path']}")
    print("\n  First 300 chars of text:")
    print(f"  {result['text'][:300]}")

    # Clean up temp PDF
    if os.path.exists(result["pdf_path"]):
        os.unlink(result["pdf_path"])
        print(f"\n  [cleanup] Deleted temp PDF")


def _extract_text(result: dict) -> str:
    """Pull plain text out of an MCP tools/call response."""
    content = result.get("content", [])
    parts = [item["text"] for item in content if item.get("type") == "text"]
    return " ".join(parts).strip()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape a URL via Playwright MCP (demo)")
    parser.add_argument("--url", default="https://example.com", help="URL to scrape")
    args = parser.parse_args()
    asyncio.run(main(args.url))
