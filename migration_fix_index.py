import json
import io
with io.open('migration-mapping-root.json','r',encoding='utf-8') as f:
    data = json.load(f)
out = '# Документация Databird\n\n'
for s in data:
    folder = s.get('folder')
    slug = s.get('slug')
    out += f'- [{folder}]({slug}/)\n'
with io.open('index.md','w',encoding='utf-8') as f:
    f.write(out)
print('Wrote index.md entries:', len(data))