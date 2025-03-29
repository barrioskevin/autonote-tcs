const fs = require('node:fs/promises');
const { chromium } = require("playwright");
const { parseNotes } = require("./parser");
require("dotenv").config();

//read credentials from enviornment variables.
const PIKE_EMAIL = process.env.PIKE_EMAIL;
const PIKE_PASSWORD = process.env.PIKE_PASSWORD;
if (!PIKE_EMAIL) {
  console.log("NO EMAIL DEFINED, CHECK YOUR .env");
  process.exit(1);
}
if (!PIKE_PASSWORD) {
  console.log("NO PASSWORD DEFINED, CHECK YOUR .env");
  process.exit(1);
}

const MC = {
  url: "https://server.thecoderschool.com/toolset/",
  email: PIKE_EMAIL,
  password: PIKE_PASSWORD,
  pikeSignIn:
    "a[href='https://pike13.com/oauth/authorize?client_id=4xSEtgehj8RCA30riFUo96CtA8LGJ4lhkxWEYHVU&response_type=code&redirect_uri=https%3A%2F%2Fserver.thecoderschool.com%2Ftoolset%2F']",
  pikeEmail: "#account_email",
  pikePassword: "#account_password",
  todoColor: "rgb(0, 170, 0)",
  seenColor: "rgb(102, 102, 102)",
  noShowColor: "rgb(0, 0, 0)",
};

const generate = async (genFileName, todaysDate) => {
  // setup browser & context
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  //open the sign in page & sign in.
  const page = await context.newPage();
  await page.goto(MC.url);
  await page.getByPlaceholder("Email address").fill(MC.email);
  await page.getByPlaceholder("Password").fill(MC.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByRole("button", { name: "Allow Access" }).click();

  //open notes page - newPage
  const [newPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Notes+" }).click(),
  ]);
  await newPage.waitForLoadState("domcontentloaded");

  //get todays div and extract the noteButtons
  const todaysLocator = await newPage.getByText(todaysDate);
  const locatorCheck = await todaysLocator.count();
  if (locatorCheck === 0) {
    console.log(`[ERROR] Couldnt find notes for provided date: ${todaysDate}`);
    await browser.close();
    return;
  }
  const noteButtons = todaysLocator.locator("button.notebutton");

  //use the noteButtons to get the names.
  const N = await noteButtons.count();
  const studentNames = [];
  //const name_to_buttons = new Map();

  for (let i = 0; i < N; i++) {
    const content = await noteButtons.nth(i).textContent();
    const splits = content.split(" ");
    const time = splits[0];
    let fnIdx = 3;
    let lnIdx = 4;
    if (splits.length === 4) {
      fnIdx -= 1;
      lnIdx -= 1;
    }
    const name = (
      splits[fnIdx] +
      " " +
      splits[lnIdx] +
      (splits.length === 6 ? " " + splits[5] : "")
    )
      .replace("Session", "")
      .replace("Coaching", "")
      .replace("Class", "")
      .trim()
      .toLowerCase();
    const color = await noteButtons.nth(i).evaluate((button) => {
      return window.getComputedStyle(button).backgroundColor.trim();
    });
    if (color === "rgb(0, 170, 0)") {
      studentNames.push(name);
    }
    //name_to_buttons.set(name, noteButtons.nth(i));
  }
  await browser.close();

  let templateText = undefined;
  try {
    templateText = await fs.readFile('template', { encoding: 'utf-8' });
  } catch (error) {
    console.log(
      "ERROR reading the template.",
    );
    console.log(error);
    process.exit(1);
  }

  const lines = templateText.split("\n");

  //for each name, fill the template.
  let newContent = ""; 
  const seenNames = [];
  studentNames.forEach((name, index) => {
    console.log("fillilng template for: ", name);
    if(!seenNames.includes(name))
      if(index !== studentNames.length - 1)
        newContent = newContent.concat(templateText.replaceAll("{student_name}", name), "\n"); 
      else
        newContent = newContent.concat(templateText.replaceAll("{student_name}", name)); 
    seenNames.push(name);
  });

  try {
    await fs.writeFile(genFileName, newContent);
    console.log(`Generator filled template to file: ${genFileName}`);
  } catch (error) {
    console.log(
      "ERROR generating note template.",
    );
    console.log(error);
    process.exit(1);
  }
};

const run = async () => {
  const argc = process.argv.length;
  if (argc !== 4) {
    console.log("Usage:");
    console.log("\n $ npm run generate -- 'date'\n");
    console.log(
      "NOTE: Date should be provided 'mm/dd'.\n",
    );
    process.exit(1);
  }
  //dates will always be updated to the current year!
  const noteDate = new Date(process.argv[3]);
  noteDate.setFullYear(new Date().getFullYear());
  if (isNaN(noteDate.getTime())) {
    console.log(`Error reading entered date: ${process.argv[3]}`);
    process.exit(1);
  }

  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12"
  ];
  const noteFileName = `notes_${months[noteDate.getMonth()]}${noteDate.getDate()}.txt`;
  const noteDateString = noteDate
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .replace(",", "");

  //check if file exists already.
  try {
    const stats = await fs.stat(noteFileName);
    if(stats.isFile()) {
      console.log(`File already exists: ${noteFileName}`);
      console.log(`Quitting...`);
      process.exit(1);
    }
  } catch (error) {
    if(error.errno !== -2)
    {
      console.log(error);
      process.exit(1);
    }
  }

  console.log("Running autonote template generator...");
  console.log(`Generating For Date: ${noteDateString}`);
  console.log(`Will create new file: ${noteFileName}`);

  await generate(noteFileName, noteDateString);

  console.log("Now you can fill in the notes for your students and run the submitter!");
  console.log("Thank you for using autonote...");
};

run();
