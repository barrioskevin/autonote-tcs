const { chromium } = require('playwright');
const { parseNotes } = require('./parser');
require('dotenv').config();

//read credentials from enviornment variables.
const PIKE_EMAIL = process.env.PIKE_EMAIL;
const PIKE_PASSWORD = process.env.PIKE_PASSWORD;
if(!PIKE_EMAIL)
{
  console.log("NO EMAIL DEFINED, CHECK YOUR .env");
  process.exit(1);
}
if(!PIKE_PASSWORD)
{
  console.log("NO PASSWORD DEFINED, CHECK YOUR .env");
  process.exit(1);
}

const MC = {
  url: "https://server.thecoderschool.com/toolset/",
  email: PIKE_EMAIL,
  password: PIKE_PASSWORD,
  pikeSignIn: "a[href='https://pike13.com/oauth/authorize?client_id=4xSEtgehj8RCA30riFUo96CtA8LGJ4lhkxWEYHVU&response_type=code&redirect_uri=https%3A%2F%2Fserver.thecoderschool.com%2Ftoolset%2F']",
  pikeEmail: "#account_email",
  pikePassword: "#account_password",
  todoColor: "rgb(0, 170, 0)",
  seenColor: "rgb(102, 102, 102)",
  noShowColor: "rgb(0, 0, 0)",
};

//makes call to the parser script
//returns array of Note[] 
const fetchNotes = async (fileName) => {
  return await parseNotes(fileName);
}

const fillNotes = async (notes, todaysDate) => {
  // debug mode. 
  const DEBUG = false;

  // setup browser & context
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  //open the sign in page & sign in.
  const page = await context.newPage();
  await page.goto(MC.url);
  await page.getByPlaceholder('Email address').fill(MC.email);
  await page.getByPlaceholder('Password').fill(MC.password);
  await page.getByRole('button', {name: 'Sign In'}).click();
  await page.getByRole('button', {name: 'Allow Access'}).click();

  
  //open notes page - newPage
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', {name: 'Notes+'}).click(),
  ]);
  await newPage.waitForLoadState('domcontentloaded');

  //get todays div and extract the noteButtons
  const todaysLocator = await newPage.getByText(todaysDate);
  const locatorCheck = await todaysLocator.count();
  if(locatorCheck === 0)
  {
    console.log(`[ERROR] Couldnt find notes for provided date: ${todaysDate}`);
    await browser.close();
    return;
  }
  const noteButtons = todaysLocator.locator('button.notebutton');

  //use the noteButtons to get the names.
  const N = await noteButtons.count();
  const studentNames = [];
  const name_to_buttons = new Map();

  for(let i = 0; i < N; i++)
  {
    const content = await noteButtons.nth(i).textContent(); 
    const splits = content.split(' ');
    const time = splits[0];
    let fnIdx = 3;
    let lnIdx = 4;
    if(splits.length === 4)
    {
      fnIdx -= 1;
      lnIdx -= 1;
    }
    const name = (splits[fnIdx] + " " + splits[lnIdx] + (splits.length === 6 ? (" " + splits[5]) : ""))
                 .replace("Session", "")
                 .replace("Coaching", "")
                 .replace("Class", "")
                 .trim()
                 .toLowerCase();
    studentNames.push(name);
    name_to_buttons.set(name, noteButtons.nth(i));

    if(DEBUG)
    {
      console.log("DEBUG: found note name on page: ", name);
      console.log("DEBUG: full split: ", splits);
      console.log("DEBUG: full content: ", content);
    }
  }

  //check note colors
  for(let i = 0; i < N; i++)
  {
    const color = await noteButtons.nth(i).evaluate(button => {
      return window.getComputedStyle(button).backgroundColor.trim();
    });
    if(color !== 'rgb(0, 170, 0)')
    {
      name_to_buttons.delete(studentNames[i]);
    }
  }

  const studentPages = [];
  for(const [k, v] of name_to_buttons)
  {
    const [student_page] = await Promise.all([
      context.waitForEvent('page'),
      v.click(),
    ]);
    studentPages.push({ name: k, page: student_page });
  }


  if(studentPages.length > 0)
  {
    console.log("Students that need notes:");
    studentPages.forEach(sp => console.log(`\t${sp.name}`));
  }
  else
  {
    console.log("Found no students that need notes!");
    console.log("if this is not expected check date and/or duplicate names");
    await browser.close();
    return;
  }

  const AMT_NEEDED = studentPages.length > 0 ? studentPages.length : 0;

  const valid_languages = ["Scratch", "Python", "HTML/CSS", "Javascript", "Java", "C#"];
  let filled = 0;
  await Promise.all(studentPages.map(async ({name, page}) => {
    console.log("Writing note for: ", name);

    //extract student's note.
    const note = notes.find(n => n.student_name === name);
    if(!note)
    {
      console.log("No corresponding note found for ", name);
      await page.close();
      return;
    }

    await page.waitForLoadState('load');

    //verify name's match.
    const pn = await page.title();
    const page_name = pn.replace(" Notes+", "").toLowerCase();
    if(!(name === note.student_name && name === page_name))
    {
      console.log("couldn't match the name to page title for ", name);
      console.log(name, " does not equal ", note.student_name);
      console.log("OR");
      console.log(name, " does not equal ", page_name);
      await page.close();
      return;
    }

    //check for scratch warning.
    const popupLocator = page.locator("#pop-content5");
    const scratchWarning = await popupLocator.isVisible();
    if(scratchWarning)
    {
      const closeButton = page.locator("#popclose5");
      await closeButton.click();
    }

    //start new app if applicable.
    if(note.new_app)
    {
      const newAppButton = page.locator("a:has-text('start a new app')");
      const isVisible = await newAppButton.isVisible();
      if(isVisible)
      {
        await newAppButton.click();
        await page.waitForLoadState('load');
      }
    }

    //set the language.
    const languageSelector = page.locator('#language');
    if(valid_languages.includes(note.language))
    {
      await languageSelector.selectOption(note.language);
    }
    else
    {
      await languageSelector.selectOption('Other');
      const otherInput = page.locator('#otherlang');
      await otherInput.fill(note.language);
    }

    //set app name
    const appNameInput = page.locator('#appname');
    await appNameInput.fill(note.app_name);

    //fill login
    if(note.project)
    {
      const urlInput = page.locator('#url');
      const loginInput = page.locator('#login');
      const passwordInput = page.locator('#pwd');

      await urlInput.fill(note.project.url);
      await loginInput.fill(note.project.login);
      await passwordInput.fill(note.project.password);
    }

    //fill concepts
    const conceptInput = page.locator('#addconcept');
    const addConceptButton = page.locator('button.gobutton:has-text("Add")');
    for(const concept of note.concepts)
    {
      await conceptInput.fill(concept);
      await addConceptButton.click();
    }

    //fill in the note.
    const note_iframe = page.frameLocator('iframe.tox-edit-area__iframe');
    const note_body = note_iframe.locator('body');
    await note_body.pressSequentially(note.note);

    //fill in interest level.
    const interestSelector = page.locator('#studentinterest');
    await interestSelector.selectOption(note.interest_level);

    //submit the note.
    const submitButton = page.locator('input[type="submit"]');
    await submitButton.click();
    await page.waitForLoadState('load');

    //NEED TO CHECK IF ACTUALLY GOT SUMBITTED HERE!
    
    //close tab.
    console.log("Successfully submitted note for ", note.student_name);
    await page.close();
    filled += 1;
  }));

  //RIGHT NOW THE FILLEd COUNT MY NOT BE ACCURATE!
  console.log("Filled ", filled, " notes out of ", AMT_NEEDED); 
  await browser.close();
};

const run = async () => {

  const argc = process.argv.length;
  if(argc !== 4 && argc !== 5)
  {
    console.log("Usage:");
    console.log(" $ npm run submit -- 'path/to/note.txt'");
    console.log("\tOR");
    console.log(" $ npm run submit -- 'date' 'path/to/note.txt'\n");
    console.log("NOTE: Date should be provided 'mm/dd'. Omitting the date and only providing the file will try to submit notes for the current day.\n");
    console.log("Example of submitting a note for March 20th with a note file from a notes folder in the current directory.");
    console.log(" $ npm run submit -- '03/20' 'notes/note_0320.txt'");
    process.exit(1);
  }
  const noteFileName = argc === 4 ? process.argv[3] : process.argv[4];
  if(!noteFileName.toLowerCase().endsWith('.txt'))
  {
    console.log(`Error reading file name: ${noteFileName}`);
    process.exit(1);
  }

  //dates will always be updated to the current year!
  const noteDate = argc === 4 ? new Date() : new Date(process.argv[3]);
  noteDate.setFullYear(new Date().getFullYear());
  if(isNaN(noteDate.getTime()))
  {
    console.log(`Error reading entered date: ${process.argv[3]}`);
    process.exit(1);
  }
  console.log(noteDate);
  const noteDateString = noteDate.toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric",
  }).replace(",", "");

  console.log("Running autonote note submitter...");
  console.log(`Using file: ${noteFileName}`);
  console.log(`Using date: ${noteDateString}`);

  const notes = await fetchNotes(noteFileName);
  if(notes.length === 0)
  {
    console.log("No notes found from file + parser.");
    process.exit(1);
  }

  console.log(`${notes.length} notes found`);
  console.log('Students:');
  notes.forEach(note => console.log(`\t${note.student_name}`));

  await fillNotes(notes, noteDateString);

  console.log("Thank you for using autonote...");
};

run();
