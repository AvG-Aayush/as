import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AttendanceSummary {
  totalEmployees: number;
  presentToday: number;
  attendanceRate: number;
  trends: string;
  recommendations: string[];
}

export interface LeaveAnalysis {
  totalRequests: number;
  pendingRequests: number;
  approvalRate: number;
  commonReasons: string[];
  insights: string;
}

export interface PerformanceInsights {
  departmentPerformance: {
    department: string;
    score: number;
    insights: string;
  }[];
  overallTrends: string;
  recommendations: string[];
}

export async function generateAttendanceSummary(attendanceData: any[]): Promise<AttendanceSummary> {
  try {
    const prompt = `
    Analyze the following attendance data and provide insights:
    
    ${JSON.stringify(attendanceData)}
    
    Please provide:
    1. Summary of attendance patterns
    2. Trends and observations
    3. Recommendations for improvement
    
    Respond with JSON in this format:
    {
      "totalEmployees": number,
      "presentToday": number,
      "attendanceRate": number,
      "trends": "string describing trends",
      "recommendations": ["recommendation1", "recommendation2"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an HR analytics expert. Analyze attendance data and provide actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new Error("Failed to generate attendance summary: " + error);
  }
}

export async function generateLeaveAnalysis(leaveData: any[]): Promise<LeaveAnalysis> {
  try {
    const prompt = `
    Analyze the following leave request data and provide insights:
    
    ${JSON.stringify(leaveData)}
    
    Please provide:
    1. Analysis of leave patterns
    2. Common reasons for leave
    3. Approval patterns and insights
    
    Respond with JSON in this format:
    {
      "totalRequests": number,
      "pendingRequests": number,
      "approvalRate": number,
      "commonReasons": ["reason1", "reason2"],
      "insights": "string with detailed analysis"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an HR analytics expert. Analyze leave request patterns and provide strategic insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new Error("Failed to generate leave analysis: " + error);
  }
}

export async function generatePerformanceInsights(employeeData: any[], attendanceData: any[]): Promise<PerformanceInsights> {
  try {
    const prompt = `
    Analyze the following employee and attendance data to generate performance insights:
    
    Employee Data: ${JSON.stringify(employeeData)}
    Attendance Data: ${JSON.stringify(attendanceData)}
    
    Please provide:
    1. Department-wise performance analysis
    2. Overall trends and patterns
    3. Strategic recommendations
    
    Respond with JSON in this format:
    {
      "departmentPerformance": [
        {
          "department": "string",
          "score": number (1-100),
          "insights": "string"
        }
      ],
      "overallTrends": "string describing overall trends",
      "recommendations": ["recommendation1", "recommendation2"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an HR analytics expert specializing in performance analysis. Provide strategic insights based on data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new Error("Failed to generate performance insights: " + error);
  }
}

export async function generateCustomInsight(data: any, context: string): Promise<any> {
  try {
    const prompt = `
    Context: ${context}
    Data: ${JSON.stringify(data)}
    
    Please analyze this data and provide relevant insights based on the context.
    Respond with JSON format that includes actionable insights and recommendations.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specialized in HR data analysis. Provide clear, actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new Error("Failed to generate custom insight: " + error);
  }
}
