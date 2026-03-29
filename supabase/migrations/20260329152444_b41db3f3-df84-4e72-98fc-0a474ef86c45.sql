INSERT INTO ai_prompts (prompt_type, model_type, prompt_template)
VALUES ('inn_lookup', 'technical', 'Найди данные российской организации по ИНН: {inn}. Верни строго JSON без markdown, без комментариев:
{"name":"Полное наименование организации","inn":"{inn}","kpp":"КПП если есть или пустая строка","ogrn":"ОГРН если есть или пустая строка","legal_address":"Юридический адрес если знаешь или пустая строка","director_name":"ФИО руководителя если знаешь или пустая строка"}
Если не можешь найти организацию по этому ИНН, верни: {"error":"not_found"}')
ON CONFLICT DO NOTHING;