"""Embedding generation and similarity search"""
import json
import numpy as np
from typing import List, Dict, Any
from openai import OpenAI
from supabase import Client


def get_embedding(client: OpenAI, text: str) -> List[float]:
    """Calls the embedding model via OpenRouter/OpenAI."""
    response = client.embeddings.create(
        input=[text.replace("\n", " ")],
        model="openai/text-embedding-3-small" 
    )
    return response.data[0].embedding


def retrieve_semantic(supabase: Client, doc_id: int, query: str, client: OpenAI) -> str:
    """Perform semantic search on document embeddings."""
    try:
        # 1. Embed the user's query
        print(f"[Retrieval] Embedding query: {query[:100]}")
        query_vector = get_embedding(client, query)
        print(f"[Retrieval] Query vector shape: {len(query_vector)}")
        
        # 2. Query embeddings table for the document
        print(f"[Retrieval] Fetching embeddings for doc_id: {doc_id}")
        response = supabase.table("embeddings").select("*").eq("doc_id", doc_id).execute()
        
        if not response.data or len(response.data) == 0:
            print(f"[Retrieval] No embeddings found for doc_id: {doc_id}")
            return "No content found in the document."
        
        print(f"[Retrieval] Found {len(response.data)} embeddings")
        
        # 3. Calculate cosine similarity for each chunk
        scores = []
        for idx, row in enumerate(response.data):
            try:
                embedding_data = row['embedding']
                if isinstance(embedding_data, str):
                    embedding_data = json.loads(embedding_data)
                
                embedding = np.array(embedding_data, dtype=np.float32)
                query_vec = np.array(query_vector, dtype=np.float32)
                
                # Cosine similarity
                dot_product = np.dot(embedding, query_vec)
                norm_a = np.linalg.norm(embedding)
                norm_b = np.linalg.norm(query_vec)
                similarity = dot_product / (norm_a * norm_b + 1e-10)
                
                scores.append({
                    "content": row['content'], 
                    "score": float(similarity)
                })
                print(f"[Retrieval] Chunk {idx}: similarity = {similarity:.4f}")
            except Exception as e:
                print(f"[Retrieval] Error processing embedding {idx}: {e}")
                continue
        
        if not scores:
            print("[Retrieval] No valid scores calculated")
            return "Error processing document embeddings."
        
        # 4. Sort by similarity and get top 5
        scores.sort(key=lambda x: x['score'], reverse=True)
        top_chunks = scores[:5]
        
        print(f"[Retrieval] Top scores: {[s['score'] for s in top_chunks]}")
        
        if not top_chunks or top_chunks[0]['score'] < 0.1:
            print(f"[Retrieval] Low similarity scores. Top score: {top_chunks[0]['score'] if top_chunks else 'N/A'}")
            if top_chunks:
                return top_chunks[0]['content']
            return "No relevant context found in the document."
        
        chunks = [chunk['content'] for chunk in top_chunks]
        result = "\n---\n".join(chunks)
        print(f"[Retrieval] Returning {len(chunks)} chunks")
        return result
    except Exception as e:
        print(f"[Retrieval] Error: {e}")
        import traceback
        traceback.print_exc()
        return f"Error retrieving context: {str(e)}"
