/**
 * Structured schema representation for CV data
 */
export const emptyCVData = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  summary: '',
  experience: [
    { organization: '', role: '', dates: '', bullets: [''] }
  ],
  education: [
    { organization: '', role: '', dates: '', bullets: [] }
  ],
  skills: [
    { category: 'Languages & Frameworks', items: '' },
    { category: 'Databases & Queues', items: '' },
    { category: 'Infrastructure & Operations', items: '' }
  ],
  languages: [],
  customSections: []
};

/**
 * Heuristic/rule-based CV parser that parses text into structured JSON.
 * @param {string} text - The raw text of the CV.
 * @returns {object} Structured CV data.
 */
export function parseCVHeuristic(text) {
  const data = JSON.parse(JSON.stringify(emptyCVData));
  data.experience = [];
  data.education = [];
  data.skills = [];

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return data;

  // 1. Personal Information extraction (first few lines)
  data.name = lines[0];
  
  if (lines[1] && !lines[1].includes('@') && !lines[1].match(/\d/)) {
    data.title = lines[1];
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
  const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/i;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !data.email) {
      data.email = emailMatch[0];
    }
    
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !data.phone) {
      data.phone = phoneMatch[0];
    }

    const liMatch = line.match(linkedinRegex);
    if (liMatch && !data.linkedin) {
      data.linkedin = liMatch[0];
    }
    const ghMatch = line.match(githubRegex);
    if (ghMatch && !data.github) {
      data.github = ghMatch[0];
    }

    if (line.includes('Herzliya') || line.includes('Tel Aviv') || line.includes('Israel') || line.includes('London') || line.includes('York')) {
      const parts = line.split(/[|•\t]/);
      for (const pt of parts) {
        if (pt.includes('Herzliya') || pt.includes('Tel Aviv') || pt.includes('London') || pt.includes('York')) {
          data.location = pt.trim();
        }
      }
    }
  }

  // 2. Section splitting
  let currentSection = '';
  let currentCustomTitle = '';
  let sectionText = [];
  const sectionContent = {};
  const customSectionContent = {};

  const headers = {
    summary: ['summary', 'about', 'profile', 'objective', 'professional summary'],
    experience: ['experience', 'work', 'employment', 'history', 'professional experience'],
    education: ['education', 'academic', 'studies'],
    skills: ['skills', 'technical skills', 'skills & tools', 'skills and technologies'],
    languages: ['languages', 'language', 'languages & languages', 'languages and languages']
  };

  const customHeaders = {
    'Military Service': ['military', 'military service', 'service', 'army', 'idf'],
    'Certifications': ['certifications', 'certification', 'licenses', 'courses'],
    'Projects': ['projects', 'personal projects', 'key projects'],
    'Publications': ['publications', 'articles', 'papers'],
    'Volunteering': ['volunteering', 'volunteer', 'community service']
  };

  const isHeader = (line) => {
    const cleanLine = line.toLowerCase().replace(/[:\-|]/g, '').trim();
    for (const [key, aliases] of Object.entries(headers)) {
      if (aliases.includes(cleanLine)) {
        return { type: 'standard', key };
      }
    }
    for (const [title, aliases] of Object.entries(customHeaders)) {
      if (aliases.includes(cleanLine)) {
        return { type: 'custom', title };
      }
    }
    return null;
  };

  // Group lines under section headings
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = isHeader(line);

    if (headerMatch) {
      if (currentSection) {
        if (currentSection === 'custom') {
          customSectionContent[currentCustomTitle] = [...sectionText];
        } else {
          sectionContent[currentSection] = [...sectionText];
        }
      }
      if (headerMatch.type === 'standard') {
        currentSection = headerMatch.key;
        currentCustomTitle = '';
      } else {
        currentSection = 'custom';
        currentCustomTitle = headerMatch.title;
      }
      sectionText = [];
    } else {
      if (currentSection) {
        sectionText.push(line);
      } else if (i > 1 && i < 6 && line.length > 50 && !data.summary) {
        data.summary = line;
      }
    }
  }
  if (currentSection && sectionText.length > 0) {
    if (currentSection === 'custom') {
      customSectionContent[currentCustomTitle] = [...sectionText];
    } else {
      sectionContent[currentSection] = [...sectionText];
    }
  }

  // 3. Process Summary
  if (sectionContent.summary) {
    data.summary = sectionContent.summary.join(' ');
  }

  // 4. Process Experience
  if (sectionContent.experience) {
    let currentJob = null;
    const expLines = sectionContent.experience;

    for (let i = 0; i < expLines.length; i++) {
      const line = expLines[i];
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');

      if (!isBullet && (line.includes('|') || line.includes('/') || line.includes('–') || line.includes('-') || line.match(/\d{4}/))) {
        if (currentJob) {
          data.experience.push(currentJob);
        }

        let org;
        let role = '';
        let dates = '';

        if (line.includes('|')) {
          const parts = line.split('|').map(p => p.trim());
          org = parts[0] || '';
          role = parts[1] || '';
          dates = parts[2] || '';
        } else if (line.includes('/')) {
          const parts = line.split('/').map(p => p.trim());
          org = parts[0] || '';
          const rest = parts[1] || '';
          if (rest.includes(',')) {
            const rParts = rest.split(',').map(rp => rp.trim());
            role = rParts[0] || '';
            dates = rParts[1] || '';
          } else {
            role = rest;
          }
        } else {
          org = line;
        }

        currentJob = {
          organization: org,
          role: role,
          dates: dates || 'Dates',
          bullets: []
        };
      } else if (currentJob) {
        const cleanBullet = line.replace(/^[•\-*\s]+/, '').trim();
        currentJob.bullets.push(cleanBullet);
      }
    }
    if (currentJob) {
      data.experience.push(currentJob);
    }
  }

  // 5. Process Education
  if (sectionContent.education) {
    let currentEdu = null;
    const eduLines = sectionContent.education;

    for (let i = 0; i < eduLines.length; i++) {
      const line = eduLines[i];
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');

      if (!isBullet) {
        if (currentEdu) {
          data.education.push(currentEdu);
        }
        
        let org;
        let role = '';
        let dates = '';

        if (line.includes('/')) {
          const parts = line.split('/').map(p => p.trim());
          role = parts[0] || '';
          const rest = parts[1] || '';
          if (rest.includes(',')) {
            const rParts = rest.split(',').map(p => p.trim());
            org = rParts[0] || '';
            dates = rParts[1] || '';
          } else {
            org = rest;
          }
        } else if (line.includes('|')) {
          const parts = line.split('|').map(p => p.trim());
          role = parts[0] || '';
          org = parts[1] || '';
          dates = parts[2] || '';
        } else {
          org = line;
        }

        currentEdu = {
          organization: org || 'Institution',
          role: role || 'Degree/Study',
          dates: dates || 'Dates',
          bullets: []
        };
      } else if (currentEdu) {
        currentEdu.bullets.push(line.replace(/^[•\-*\s]+/, '').trim());
      }
    }
    if (currentEdu) {
      data.education.push(currentEdu);
    }
  }

  // 6. Process Skills
  if (sectionContent.skills) {
    const skillLines = sectionContent.skills;
    for (let i = 0; i < skillLines.length; i++) {
      const line = skillLines[i];
      if (line.includes(':')) {
        const parts = line.split(':');
        data.skills.push({
          category: parts[0].trim(),
          items: parts[1].trim()
        });
      } else {
        data.skills.push({
          category: 'Skills Group',
          items: line.trim()
        });
      }
    }
  }

  // Ensure default arrays are not empty for UX
  if (data.experience.length === 0) data.experience = [{ organization: 'Company', role: 'Role', dates: 'Dates', bullets: ['Responsibility description'] }];
  if (data.education.length === 0) data.education = [{ organization: 'Institution', role: 'Degree/Study', dates: 'Dates', bullets: [] }];
  if (data.skills.length === 0) {
    data.skills = [
      { category: 'Languages & Frameworks', items: 'Node.js, TypeScript' },
      { category: 'Databases & Queues', items: 'PostgreSQL, RabbitMQ' }
    ];
  }

  // 7. Process Languages
  if (sectionContent.languages) {
    const langLines = sectionContent.languages;
    for (let i = 0; i < langLines.length; i++) {
      const line = langLines[i];
      if (line.includes(':')) {
        const parts = line.split(':');
        data.languages.push({
          name: parts[0].trim(),
          proficiency: parts[1].trim()
        });
      } else {
        data.languages.push({
          name: line.trim(),
          proficiency: ''
        });
      }
    }
  }

  // 8. Process Custom Sections
  data.customSections = [];
  for (const [title, linesList] of Object.entries(customSectionContent)) {
    let currentItem = null;
    const items = [];

    for (let i = 0; i < linesList.length; i++) {
      const line = linesList[i];
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');

      if (!isBullet && (line.includes('|') || line.includes('/') || line.includes('–') || line.includes('-') || line.match(/\d{4}/))) {
        if (currentItem) {
          items.push(currentItem);
        }
        let t;
        let sub = '';
        let dt = '';

        if (line.includes('|')) {
          const parts = line.split('|').map(p => p.trim());
          t = parts[0] || '';
          sub = parts[1] || '';
          dt = parts[2] || '';
        } else if (line.includes('/')) {
          const parts = line.split('/').map(p => p.trim());
          t = parts[0] || '';
          const rest = parts[1] || '';
          if (rest.includes(',')) {
            const rParts = rest.split(',').map(rp => rp.trim());
            sub = rParts[0] || '';
            dt = rParts[1] || '';
          } else {
            sub = rest;
          }
        } else {
          t = line;
        }

        currentItem = {
          title: t,
          subtitle: sub,
          date: dt || 'Dates',
          bullets: []
        };
      } else if (currentItem) {
        currentItem.bullets.push(line.replace(/^[•\-*\s]+/, '').trim());
      } else {
        currentItem = {
          title: 'Details',
          subtitle: '',
          date: '',
          bullets: [line.replace(/^[•\-*\s]+/, '').trim()]
        };
      }
    }
    if (currentItem) {
      items.push(currentItem);
    }
    if (items.length > 0) {
      data.customSections.push({
        id: 'custom_' + Math.random().toString(36).substr(2, 9),
        title: title,
        items: items
      });
    }
  }

  return data;
}

/**
 * Direct API Integration with Gemini for structured CV parsing
 * @param {string|File} input - Raw CV text or a File object (PDF).
 * @param {string} apiKey - Google Gemini API Key.
 * @returns {Promise<object>} Structured CV JSON matching our schema.
 */
export async function parseCVWithAI(input, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API key is required for AI parsing.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  let requestParts = [];
  const systemPrompt = `You are an expert CV parser. Extract the user details from the CV text or document below. Return a clean JSON object matching the requested schema. Make sure to separate company name, job role/title, and dates of employment for each experience block. Group skills into clean categories. Extract other sections (such as Certifications, Projects, Publications, Volunteering) into the customSections list with generic headings.`;

  if (typeof input === 'string') {
    requestParts.push({
      text: `${systemPrompt}\n\nCV TEXT TO PARSE:\n${input}`
    });
  } else if (input instanceof File) {
    const extension = input.name.split('.').pop().toLowerCase();
    if (extension === 'pdf') {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(input);
      });
      requestParts.push({ text: systemPrompt });
      requestParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      });
    } else {
      throw new Error('File type not supported for direct AI parsing. Extract text first.');
    }
  } else {
    throw new Error('Invalid input for AI parsing.');
  }

  // Structured schema for structured outputs
  const responseSchema = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      title: { type: 'STRING' },
      email: { type: 'STRING' },
      phone: { type: 'STRING' },
      location: { type: 'STRING' },
      linkedin: { type: 'STRING' },
      github: { type: 'STRING' },
      summary: { type: 'STRING' },
      experience: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            organization: { type: 'STRING' },
            role: { type: 'STRING' },
            dates: { type: 'STRING' },
            bullets: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['organization', 'role', 'dates', 'bullets']
        }
      },
      education: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            organization: { type: 'STRING' },
            role: { type: 'STRING' },
            dates: { type: 'STRING' },
            bullets: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['organization', 'role', 'dates']
        }
      },
      skills: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING' },
            items: { type: 'STRING' }
          },
          required: ['category', 'items']
        }
      },
      languages: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            proficiency: { type: 'STRING' }
          },
          required: ['name']
        }
      },
      customSections: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  subtitle: { type: 'STRING' },
                  date: { type: 'STRING' },
                  bullets: { type: 'ARRAY', items: { type: 'STRING' } }
                },
                required: ['title']
              }
            }
          },
          required: ['title', 'items']
        }
      }
    },
    required: ['name', 'title', 'email', 'phone', 'location', 'summary', 'experience', 'education', 'skills']
  };

  const payload = {
    contents: [
      {
        parts: requestParts
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || response.statusText;
      throw new Error(`Gemini API error: ${errMsg}`);
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Did not receive structured content from Gemini.');
    }

    return JSON.parse(candidateText);
  } catch (error) {
    console.error('AI CV parsing failed:', error);
    throw error;
  }
}
