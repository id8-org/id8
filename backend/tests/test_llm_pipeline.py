import pytest
from app.llm import render_idea_prompt, validate_idea_dict, parse_idea_response

def test_prompt_includes_schema():
    context = {'user_context': 'User is a SaaS founder.'}
    prompt = render_idea_prompt(context)
    assert 'Respond with a JSON object with the following fields' in prompt
    assert 'title' in prompt and 'hook' in prompt

def test_valid_idea_dict():
    idea = {
        "title": "Test Idea",
        "hook": "A great hook.",
        "value": "Value prop.",
        "evidence": "Evidence.",
        "differentiator": "Diff.",
        "call_to_action": "Act now!",
        "score": 8,
        "mvp_effort": 5,
        "type": "side_hustle",
        "assumptions": ["Assume 1"],
        "repo_usage": "For SaaS."
    }
    assert validate_idea_dict(idea)

def test_invalid_idea_dict_missing_field():
    idea = {
        "title": "Test Idea",
        # Missing 'hook'
        "value": "Value prop.",
        "evidence": "Evidence.",
        "differentiator": "Diff.",
        "call_to_action": "Act now!",
        "score": 8,
        "mvp_effort": 5,
        "type": "side_hustle",
        "assumptions": ["Assume 1"],
        "repo_usage": "For SaaS."
    }
    assert not validate_idea_dict(idea)

def test_parse_idea_response_valid():
    response = '{"title": "Test", "hook": "H", "value": "V", "evidence": "E", "differentiator": "D", "call_to_action": "C", "score": 7, "mvp_effort": 4, "type": "side_hustle", "assumptions": [], "repo_usage": "U"}'
    ideas = parse_idea_response(response)
    assert len(ideas) == 1
    assert ideas[0]['title'] == 'Test'

def test_parse_idea_response_invalid():
    response = '{"title": "Test"}'  # Missing required fields
    ideas = parse_idea_response(response)
    assert len(ideas) == 0 