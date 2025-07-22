import sys
import os

# Ensure backend is in the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'app')))

try:
    from schemas import DeepDiveStage, IteratingStage, ConsideringIdeaData  # Add more models as needed
except ModuleNotFoundError:
    import importlib.util
    schemas_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'app', 'schemas.py'))
    spec = importlib.util.spec_from_file_location("schemas", schemas_path)
    schemas = importlib.util.module_from_spec(spec)
    sys.modules["schemas"] = schemas
    spec.loader.exec_module(schemas)
    DeepDiveStage = schemas.DeepDiveStage
    IteratingStage = schemas.IteratingStage
    ConsideringIdeaData = schemas.ConsideringIdeaData

from typing import get_args, get_origin, List, Literal, Union

def python_type_to_zod(py_type):
    origin = get_origin(py_type)
    args = get_args(py_type)
    # Handle Optional (which is Union[..., NoneType])
    if origin is Union and type(None) in args:
        non_none = [a for a in args if a is not type(None)]
        if len(non_none) == 1:
            return f"{python_type_to_zod(non_none[0])}.optional()"
        else:
            # Multiple types, fallback to any
            return "z.any().optional()"
    if py_type == str:
        return "z.string()"
    if py_type == int:
        return "z.number()"
    if py_type == float:
        return "z.number()"
    if py_type == bool:
        return "z.boolean()"
    if origin == list or origin == List:
        return f"z.array({python_type_to_zod(args[0])})"
    if origin == Literal:
        if all(isinstance(a, str) for a in args):
            if len(args) == 1:
                return f"z.literal(\"{args[0]}\")"
            else:
                enum_values = ', '.join(['"' + a + '"' for a in args])
                return f"z.enum([{enum_values}])"
        if all(isinstance(a, (int, float)) for a in args):
            return f"z.enum([{', '.join(map(str, args))}])"
    return "z.any()"

def model_to_zod(model):
    fields = model.__annotations__
    lines = ["z.object({"]
    for name, typ in fields.items():
        zod_type = python_type_to_zod(typ)
        lines.append(f"  {name}: {zod_type},")
    lines.append("})")
    return "\n".join(lines)

if __name__ == "__main__":
    # Add more models here as needed
    for model in [DeepDiveStage, IteratingStage, ConsideringIdeaData]:
        print(f"// {model.__name__}")
        print("export const " + model.__name__[0].lower() + model.__name__[1:] + "Schema =")
        print(model_to_zod(model))
        print()