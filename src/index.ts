import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import { Document, Packer, Paragraph, TextRun } from "docx";

(puppeteer as any).use(StealthPlugin());

const app = express();

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
}); // Allow all origins to access this API

const getQuizletJson = async (url: string) => {
  try {
    const browser = await (puppeteer as any).launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    if (!browser) {
      throw new Error(
        "Unable to launch browser. Check Puppeteer installation."
      );
    }

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const raw = await page.$eval(
      "script[id=__NEXT_DATA__]",
      (el: any) => el.textContent
    );

    if (!raw) {
      console.error("No __NEXT_DATA__ script found on the page.");
      await browser.close();
      return null;
    }

    // Parse dữ liệu JSON
    const parsed = JSON.parse(raw);

    // Trích xuất dehydratedReduxStateKey
    const dehydratedReduxStateKey =
      parsed?.props?.pageProps?.dehydratedReduxStateKey;

    if (!dehydratedReduxStateKey) {
      console.error("dehydratedReduxStateKey not found.");
      await browser.close();
      return null;
    }
    const reduxState = JSON.parse(dehydratedReduxStateKey);
    const studiableItems =
      reduxState?.studyModesCommon?.studiableData?.studiableItems;

    if (!studiableItems) {
      console.error("studiableItems not found in dehydratedReduxStateKey.");
      await browser.close();
      return null;
    }

    // Chuyển đổi dữ liệu thành dạng yêu cầu
    const formattedItems = studiableItems.reduce((acc: any, item: any) => {
      const question = item.cardSides.find(
        (side: any) => side.label === "word"
      );
      const answer = item.cardSides.find(
        (side: any) => side.label === "definition"
      );

      if (question && answer) {
        acc[`Q${item.id}`] = {
          question: question.media[0]?.plainText || "",
          answer: answer.media[0]?.plainText || "",
        };
      }

      return acc;
    }, {});

    await browser.close();
    return formattedItems;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}; // Fetch api Quizlet for get data

const saveQuestionsToWord = async (
  data: Record<string, { question: string; answer: string }>,
  outputPath: string
): Promise<void> => {
  const children: Paragraph[] = [];
  let questionNumber = 1;

  for (const [key, item] of Object.entries(data)) {
    const questionLines = item.question.split("\n").map((line) => line.trim());
    let mainQuestion = questionLines[0];
    if (!mainQuestion.endsWith("?") && !mainQuestion.endsWith(":")) {
      mainQuestion += ":";
    }

    const questionRun = new TextRun(`${questionNumber}. ${mainQuestion}`);

    // Tạo câu trả lời
    const answerLines = formatAnswers(
      questionLines.slice(1).join("\n"),
      item.answer
    ).map((line) => {
      // Kiểm tra nếu câu trả lời đúng (có dấu "=" ở cuối)
      const isCorrect = line.endsWith("=");
      return new TextRun({
        text: line,
        color: isCorrect ? "FF0000" : undefined, // Đặt màu đỏ nếu là đáp án đúng
        break: 1, // Soft line break
      }); // Sử dụng break: 1 cho soft line break
    });

    // Gộp câu hỏi và câu trả lời trong một đoạn
    children.push(
      new Paragraph({
        children: [questionRun, ...answerLines],
        spacing: {
          after: 0, // Loại bỏ khoảng cách giữa các đoạn
          before: 0,
          line: 276,
        },
        contextualSpacing: true,
      })
    );

    questionNumber++;
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}; // Save questions to Word

const formatAnswers = (
  questionText: string,
  correctAnswer: string
): string[] => {
  const lines = questionText.split("\n").map((line) => line.trim());
  const formattedLines: string[] = [];
  const correctOption = correctAnswer.toUpperCase();

  for (const line of lines) {
    if (line && line[0].toLowerCase() >= "a" && line[0].toLowerCase() <= "z") {
      const optionLetter = line[0].toUpperCase();
      let formattedLine = `${optionLetter}. ${line.slice(2).trim()};[*]`;
      if (optionLetter === correctOption) {
        formattedLine += " =";
      }
      formattedLines.push(formattedLine);
    } else {
      formattedLines.push(line);
    }
  }
  return formattedLines;
}; // Format answers

app.get("/quizlet-set/:setId", async (req, res) => {
  const setId = req.params.setId;
  const url = `https://quizlet.com/vn/${setId}`;
  try {
    const data = await getQuizletJson(url);
    if (!data) {
      res
        .status(404)
        .json({ message: "No data found or unable to parse data." });
      return;
    }

    const outputPath = "questions.docx";
    saveQuestionsToWord(data, outputPath)
      .then(() => {
        console.log(`File Word đã được lưu tại: ${outputPath}`);
      })
      .catch((error) => {
        console.error("Có lỗi xảy ra khi lưu file:", error);
      });

    res.setHeader("Cache-Control", "public, max-age=0");
    res.json(`File Word đã được lưu tại: ${outputPath}`);
  } catch (error: any) {
    console.log(error);
    res.status(500).send(error.message);
  }
}); // Define a route to handle Quizlet set requests

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); // Start the server
