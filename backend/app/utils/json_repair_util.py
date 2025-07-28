import logging
try:
    import dirtyjson
except ImportError:
    dirtyjson = None
    logging.getLogger(__name__).warning("dirtyjson not available")
import re

def repair_json_with_py(raw: str) -> str:
    import types
    if isinstance(raw, types.CoroutineType):
        logging.getLogger(__name__).warning("repair_json_with_py received a coroutine instead of a string/bytes. Await the coroutine before passing to this function.")
        return ""
    if dirtyjson is None:
        raise RuntimeError("dirtyjson is not available")
    try:
        # dirtyjson returns a Python object, so re-serialize to string
        obj = dirtyjson.loads(raw)
        import json
        return json.dumps(obj)
    except Exception as e:
        logging.getLogger(__name__).warning(f"dirtyjson failed: {e}")
        return raw

def extract_json_from_llm_response(response: str) -> str:
    """
    Extracts the first JSON object from an LLM response, removing preambles, code fences, and language tags.
    Handles cases where multiple JSON objects are separated by delimiters like "---".
    """
    # Remove code fences and language tags
    response = re.sub(r"^```[a-zA-Z]*\n?", "", response.strip())
    response = re.sub(r"\n```$", "", response)
    
    # Split by common delimiters that might separate multiple JSON objects
    delimiters = ['---', '###', '===']
    for delimiter in delimiters:
        if delimiter in response:
            response = response.split(delimiter)[0].strip()
    
    # Find the first '{' and try to find the matching closing '}'
    start = response.find('{')
    if start == -1:
        return response
    
    # Find the matching closing brace by counting braces
    brace_count = 0
    end = start
    
    for i, char in enumerate(response[start:], start):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i
                break
    
    if brace_count == 0:
        response = response[start:end+1]
    
    return response 