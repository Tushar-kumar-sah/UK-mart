import { NextRequest, NextResponse } from 'next/server';

// If you have a Gemini API key, store it in .env as GEMINI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    // Build the prompt based on the analysis type
    let prompt = '';
    if (type === 'sales_trend') {
      prompt = `Analyze this grocery store sales data and provide insights in JSON format: ${JSON.stringify(data)}. Provide: 1) Overall trend (growing/declining/stable) 2) Best performing categories 3) Recommendations for improving sales 4) Peak ordering times if visible 5) Average order value trend`;
    } else if (type === 'inventory') {
      prompt = `Analyze this grocery inventory data and provide recommendations in JSON format: ${JSON.stringify(data)}. Provide: 1) Items that need restocking urgently 2) Items with excess stock 3) Optimal stock levels for each category 4) Seasonal recommendations`;
    } else if (type === 'customer_behavior') {
      prompt = `Analyze this customer order data and provide insights in JSON format: ${JSON.stringify(data)}. Provide: 1) Most popular products 2) Average order value 3) Repeat customer rate 4) Popular categories 5) Recommendations for increasing customer retention`;
    } else {
      prompt = `Analyze this grocery store data and provide business insights: ${JSON.stringify(data)}`;
    }

    // If no API key is set, return mock data
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set – returning mock analysis.');
      return NextResponse.json(getMockAnalysis(type));
    }

    // Call Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are a grocery business analytics expert. Provide concise, actionable insights. Always respond in valid JSON format with keys: summary, insights (array of objects with title and description), recommendations (array of strings), metrics (object with key-value pairs).\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('AI Analyzer error:', error);
    // Return a graceful fallback
    return NextResponse.json({
      summary: 'Analysis could not be completed at this time.',
      insights: [{ title: 'System Note', description: 'AI analysis service is temporarily unavailable.' }],
      recommendations: ['Try again later', 'Ensure sufficient data exists'],
      metrics: {},
    }, { status: 200 });
  }
}

// Fallback mock data if API key is missing or Gemini fails
function getMockAnalysis(type: string) {
  const base = {
    summary: 'Mock analysis – set GEMINI_API_KEY for real insights.',
    insights: [{ title: 'Test Insight', description: 'This is a placeholder. Add your Gemini API key to get real analysis.' }],
    recommendations: ['Add GEMINI_API_KEY to .env', 'Restart the server'],
    metrics: { status: 'mock' },
  };
  if (type === 'sales_trend') {
    return {
      ...base,
      summary: 'Sales are stable with a slight upward trend. (Mock)',
      insights: [
        { title: 'Best Performing Category', description: 'Fruits & Vegetables' },
        { title: 'Peak Order Time', description: 'Evenings between 6-8 PM' },
      ],
      recommendations: ['Increase stock of popular items', 'Run evening promotions'],
      metrics: { avgOrderValue: '₹1,200', dailyOrders: '45' },
    };
  }
  // similar for other types...
  return base;
}