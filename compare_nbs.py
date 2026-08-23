import json
import difflib

def compare_nbs(f1, f2):
    try:
        with open(f1, 'r', encoding='utf-8') as f:
            nb1 = json.load(f)
        with open(f2, 'r', encoding='utf-8') as f:
            nb2 = json.load(f)
    except Exception as e:
        print(f'Error: {e}')
        return

    c1 = nb1.get('cells', [])
    c2 = nb2.get('cells', [])
    
    if len(c1) != len(c2):
        print(f'Different number of cells: {f1} has {len(c1)}, {f2} has {len(c2)}')
    
    found_diff = False
    for i in range(min(len(c1), len(c2))):
        s1 = "".join(c1[i].get('source', []))
        s2 = "".join(c2[i].get('source', []))
        if s1 != s2:
            found_diff = True
            print(f'\n--- Difference in cell {i} (type: {c1[i].get("cell_type")}) ---')
            diff = difflib.unified_diff(s1.splitlines(), s2.splitlines(), lineterm='')
            print('\n'.join(list(diff)))
            
    if not found_diff and len(c1) == len(c2):
        print("The notebooks are identical in terms of source code.")

compare_nbs(r'c:\Users\noey\Desktop\DSA_AIEE\IGNORE\TA\week4\answer_lab7_DSA_Lab_5.ipynb', r'c:\Users\noey\Desktop\DSA_AIEE\IGNORE\TA\week4\answer_DSA_Lab_5.ipynb')
