import { promises as fs } from "fs";

interface Project {
  url: string;
  login: string;
  password: string;
}

interface Note {
  student_name: string;
  new_app: boolean;
  concepts: string[];
  note: string;
  language: string;
  interest_level: string;
  project?: Project;
  app_name: string;
}

/**
 * parses the notes written from a text file to an array of
 * Note objects.
 *
 * the file is expected to follow the provided template for writting notes.
 *
 * if an error occurs in the parsing process the function should return an empty
 * array and an output error message would be printed. i plan on coming up with
 * a better way, maybe throwing the error excplicitly? but right now i just check for
 * an empty array when using this to ensure notes exists.
 *
 * @param fileName - path of file to be read by fs.readFile
 * @return Note[] array of successfully parsed notes.
 */
export const parseNotes = async (fileName: string) => {
  console.log("Running note parser...");
  const notes: Note[] = [];
  try {
    const text = await fs.readFile(fileName, "utf-8");
    const lines = text.split("\n");

    let note_processed = false;
    let student_name = "";
    let new_app = false;
    let note = "";
    let language = "";
    let interest_level = "green";
    let project: Project | undefined = undefined;
    let app_name = "";
    let concepts: string[] = [];

    lines.forEach((line, index) => {
      if (line.includes("---New App For ")) {
        new_app = true;
      } else if (line.includes("---Language For ")) {
        const splits = line.split(" ");
        const threePartName = splits.length === 5;
        student_name = threePartName
          ? splits[2] + " " + splits[3] + " " + splits[4]
          : splits[2] + " " + splits[3];
        student_name = student_name.replace("---", "");
        language = lines[index + 1];
      } else if (line.includes("---App Name For ")) {
        app_name = lines[index + 1];
      } else if (line.includes("---Project Details For ")) {
        const url = lines[index + 1].replace("URL:", "");
        const login = lines[index + 2].replace("Login:", "");
        const password = lines[index + 3].replace("Password:", "");
        if (url !== "" && login !== "" && password != "") {
          project = {
            url: url,
            login: login,
            password: password,
          };
        }
      } else if (line.includes("---Note For ")) {
        let track = 1;
        let curr = lines[index + track];
        while (curr !== "---end of note---") {
          note += curr;
          track += 1;
          curr = lines[index + track];
          note += "\n";
        }
      } else if (line.includes("---Concepts For ")) {
        concepts = lines[index + 1].split(",").map((concept) => concept.trim());
      } else if (line.includes("---end of concepts---")) {
        note_processed = true;
      }

      if (note_processed) {
        const new_note: Note =
          project === undefined
            ? {
                student_name: student_name,
                new_app: new_app,
                concepts: [...concepts],
                note: note,
                language: language,
                interest_level: interest_level,
                app_name: app_name,
              }
            : {
                student_name: student_name,
                new_app: new_app,
                concepts: [...concepts],
                note: note,
                language: language,
                project: project,
                interest_level: interest_level,
                app_name: app_name,
              };
        notes.push(new_note);
        note_processed = false;
        student_name = "";
        new_app = false;
        note = "";
        language = "";
        interest_level = "green";
        app_name = "";
        project = undefined;
        concepts.length = 0;
      }
    });
    console.log("Parser completed...");
  } catch (error) {
    console.log("Error in note parsing!!");
    console.log(error);
  }

  return notes;
};
