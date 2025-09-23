-- Add default AI prompts if they don't exist
INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'cover', 'Create a professional product cover image for "{productName}" in the {category} category. Key features: {benefits}. Use clean, modern design with product prominently displayed. Include key selling points as readable text overlay. High quality, commercial photography style.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'cover');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'lifestyle', 'Create a lifestyle image showing "{productName}" ({category}) being used in a real-life scenario. Highlight: {benefits}. Show the product in context of daily use, professional setting, clean background, natural lighting.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'lifestyle');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'macro', 'Create a detailed macro/close-up image of "{productName}" ({category}) showing fine details, materials, and construction. Emphasize: {benefits}. Professional product photography, high resolution, clean white background.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'macro');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'beforeAfter', 'Create a before/after comparison image for "{productName}" in {category}. Show transformation/improvement: {benefits}. Split-screen or side-by-side comparison, clear visual difference, professional presentation.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'beforeAfter');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'bundle', 'Create a product bundle image showing "{productName}" ({category}) with complementary items or accessories. Highlight value: {benefits}. Organized layout, professional photography, value proposition clearly visible.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'bundle');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'guarantee', 'Create a guarantee/warranty image for "{productName}" ({category}) emphasizing trust and quality. Features: {benefits}. Include trust badges, warranty information, professional certification symbols.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'guarantee');

-- Also add the new card types that are used in the frontend
INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'features', 'Create a feature highlights image for "{productName}" ({category}) showcasing key properties and benefits: {benefits}. Use infographic style, clear icons, readable text, professional layout.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'features');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'usage', 'Create an instructional image showing how to use "{productName}" ({category}). Step-by-step guide highlighting: {benefits}. Clear instructions, numbered steps, easy to follow visual guide.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'usage');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'comparison', 'Create a comparison chart image for "{productName}" ({category}) against competitors. Highlight advantages: {benefits}. Professional table/chart format, clear visual hierarchy.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'comparison');

INSERT INTO ai_prompts (prompt_type, prompt_template)
SELECT 'clean', 'Create a clean product photo of "{productName}" ({category}) with no graphics or text overlays. Pure product photography showing: {benefits}. White background, professional lighting, high quality.'
WHERE NOT EXISTS (SELECT 1 FROM ai_prompts WHERE prompt_type = 'clean');