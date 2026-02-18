#!/usr/bin/env python3
# Create a minimal valid PDF for testing

pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 400 >>
stream
BT
/F1 12 Tf
100 750 Td
(Chong Chun Man - Profile) Tj
0 -20 Td
(Name: Chong Chun Man) Tj
0 -20 Td
(Position: Marketing Director) Tj
0 -20 Td
(Company: BrandSphere Global) Tj
0 -20 Td
(Location: New York) Tj
0 -20 Td
(Years of Experience: 10 plus years) Tj
0 -20 Td
(Expertise: Strategic marketing, brand development) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000074 00000 n
0000000133 00000 n
0000000281 00000 n
0000000380 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
830
%%EOF"""

with open('test_document.pdf', 'wb') as f:
    f.write(pdf_content)

print('Test PDF created successfully: test_document.pdf')
