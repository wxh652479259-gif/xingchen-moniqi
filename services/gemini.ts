
import { GoogleGenAI } from "@google/genai";
import { Stock } from "../types";

// Always initialize with the direct process.env.API_KEY variable as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIAnalysis = async (stock: Stock) => {
  try {
    const prompt = `你是一个专业的A股操盘手。当前股票：${stock.name} (${stock.code})，所属板块：${stock.sector}，现价：${stock.price.toFixed(2)}。
    请针对该股票的市场表现（基于模拟环境）给出一段幽默且带有投资建议的话，字数50字左右。直接输出内容即可。`;
    
    // Call generateContent with both model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Use the .text property directly from GenerateContentResponse.
    return response.text || "AI 投顾正在盯着大盘，请稍后再试。";
  } catch (error) {
    console.error("AI Error:", error);
    return "由于市场波动过大，AI 分析师暂时去喝咖啡了。";
  }
};
