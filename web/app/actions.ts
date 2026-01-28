'use server'

import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Initialize Gemini
// Note: In production, ensure these keys are set. For now we use the env var.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set");
}

const fileManager = new GoogleAIFileManager(apiKey || "");
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function processFile(formData: FormData) {
  if (!apiKey) {
    return { success: false, error: "Server configuration error: Missing API Key" };
  }

  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };

  // Generate a unique filename to avoid collisions
  const uniqueId = Math.random().toString(36).substring(7);
  const tempFilePath = join(tmpdir(), `${uniqueId}-${file.name}`);

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save to temp file
    await writeFile(tempFilePath, buffer);

    console.log("Uploading to Gemini Files API...");
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: file.type,
      displayName: file.name,
    });

    console.log(`File uploaded: ${uploadResult.file.uri}`);

    // Wait for file to be active
    let remoteFile = await fileManager.getFile(uploadResult.file.name);
    while (remoteFile.state === "PROCESSING") {
      console.log("File is processing...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      remoteFile = await fileManager.getFile(uploadResult.file.name);
    }

    if (remoteFile.state !== "ACTIVE") {
      throw new Error(`File processing failed with state: ${remoteFile.state}`);
    }

    console.log("File is active, generating summary...");
    
    // Note: We use the *updated* file uri or name just to be safe, though URI should match.
    // The previous code had "gemini-3-flash-preview", keeping that or updating if user wants.
    // User didn't ask to change model back, but the error screenshot showed they are using it.
    
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    const result = await model.generateContent([
      `이 파일을 심층적으로 분석하여 한국어로 요약해 주세요. 
      가독성을 극대화하기 위해 다음 규칙을 엄격히 준수해 주세요:

      1. **구조화된 불릿 포인트**: 긴 줄글 대신 짧고 명확한 불릿 포인트(•)를 사용하세요.
      2. **계층 구조**: 필요하다면 하위 불릿 포인트를 사용하여 내용을 구조화하세요.
      3. **이모지 활용**: 각 섹션과 주요 포인트 앞에 적절한 이모지를 배치하여 시각적 구분을 도우세요.
      4. **마크다운 포맷**: **볼드체**로 핵심 단어를 강조하세요.

      [작성 포맷]
      # 📑 문서 요약

      ## 💡 핵심 요약
      - (핵심 내용을 3문장 이내로 간결하게 요약)

      ## 🔑 주요 내용
      - **(이모지) 주제 1**
        - 상세 설명 (간결하게)
        - 상세 설명 (간결하게)
      - **(이모지) 주제 2**
        - 상세 설명 (간결하게)
        - 상세 설명 (간결하게)
      
      ## 📝 세부 분석
      - (내용을 계층형 불릿 포인트로 상세히 정리)

      ## 🎯 결론 및 시사점
      - (최종 결론 요약)`,
      {
        fileData: {
          fileUri: remoteFile.uri, // Use the active file URI
          mimeType: remoteFile.mimeType,
        },
      },
    ]);

    const summary = result.response.text();
    
    return { success: true, summary, fileUri: uploadResult.file.uri, mimeType: file.type };

  } catch (error: any) {
    console.error("Error processing file:", error);
    return { success: false, error: error.message || "Failed to process file" };
  } finally {
    // Cleanup temp file
    await unlink(tempFilePath).catch((e) => console.error("Cleanup error:", e));
  }
}
