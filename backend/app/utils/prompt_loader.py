import os

def load_prompt(stage: str) -> str:
    base_dir = os.path.dirname(__file__)
    prompt_path = os.path.join(base_dir, '..', 'prompts', stage, f'{stage}.rail')
    prompt_path = os.path.abspath(prompt_path)
    with open(prompt_path, 'r', encoding='utf-8') as f:
        return f.read() 