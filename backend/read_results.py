import sys
with open('test_results.txt', 'rb') as f:
    raw = f.read()
# try utf-16-le (BOM)
try:
    text = raw.decode('utf-16')
except:
    text = raw.decode('utf-8', errors='replace')
for line in text.strip().splitlines():
    print(line)
