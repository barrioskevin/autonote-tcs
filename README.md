<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/barrioskevin/autonote-tcs">
    <img src="images/logo.png" alt="Logo">
  </a>

<h3 align="center">AutoNote - TCS</h3>

  <p align="center">
    An automated note submitter for The Coder School notes.
  </p>
    <br/>
 <p align="center"><strong>Software NOT affiliated with The CoderSchool.</strong></p>
</div>

## About The Project

This project is designed to streamline the process of submitting notes to The Coder School's Notes+ section.  

Instead of manually entering notes through the web interface, AutoNote allows you to write your notes in a `.txt` file using a predefined template and automatically submit them.

### Why use AutoNote?

- **Saves time**: No need to wait for popups or manually switch between multiple tabs.
- **Batch submission**: Submit multiple notes asynchronously instead of one by one.
- **Better editing experience**: Write notes in your preferred text editor with all its features (syntax highlighting, spell check, etc.), without needing to copy and paste each note manually.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- **npm**
- **TypeScript (`tsc`)**

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/barrioskevin/autonote-tcs.git
   ```
2. Step into the project directory
   ```sh
   cd autonote-tcs/
   ```
3. Install NPM packages
   ```sh
    # ensure you are in the project directory.
   npm install
   ```
4. Copy the template to write your notes.
   ```sh
   cp template notes_today.txt
   ```
5. Fill in all your notes
   ```sh
   # see usage for how to follow template.
   ```
7. Copy the env template to a .env file and fill in with your information.
   ```sh
   cp env-template .env
   ```
8. Run the submitter (see usage for more options).
   ```sh
   npm run submit -- 'notes_today.txt'
   ```

<!-- USAGE EXAMPLES -->

## Usage

### .env File

Since this program submits the notes on your behalf some sort of credentials are required. 

I know it might not be the safest way to handle this but I came up with a .env file that will hold account credentials for signing in to `Pike13`. Playwright will then internally use these credentials when signing in to submit notes.

The credentials only exists for as long as the program is running and is not stored or used anywhere else. You can copy the `env-template` to a new file called `.env` and fill out your information, this is what the final .env file is expected to look like.

```sh
# .env file
PIKE_EMAIL='your@email.com'
PIKE_PASSWORD='password'
```

### Writing notes based on template.

When writing your notes you just need to fill out the template for each note you write.

You can easily find and replace values for example in your editor search for `{student_name}` and replace with `john doe`.
Do not include the brackets in final note!

The information under Project Details is not required to be filled but it's usually helpful if you do, leaving it blank will leave what was already on the current note.

The parser does NOT read comments. Below is just an example to show how the note might be filled do not leave them in the actual note as they will be read as the actual values. 
```sh
# if starting a new app, you should include the line below.
---New App For {student_name}---
---Language For {student_name}---
# You can use any value here, if not found it will be placed under Other.
# Python OR Scratch OR Lua
---App Name For {student_name}---
# Name of the project if New App isnt specified this will update project name for student.
# Space Shooter
---Project Details For {student_name}---
URL:
Login:
Password:
---Note For {student_name}---
#YOUR NOTE HERE.
# Can be multi line but i typically use a single line.
---end of note---
---Concepts For {student_name}---
#COMMA SEPERATED CONCEPTS
# syntax, x and y, variables, function, string
---end of concepts---
```

You can have multiple notes in the same file but they should all correspond to the same day as the submitter will use one file and one date.

### Submitting notes.

After setting up the `.env` file and having a notes file ready you can run the submitter. When running the submitter you must provide the note file and optionally a date. If you don't provide a date it will default to todays date and try to submit the notes accordingly. If you have a specific date you can specify it using MM/dd format. Submitting a note file for March 20th:

```sh
npm run submit -- '03/20' 'notes.txt'
```

Or if your notes already correspond to the current day you can just run:

```sh
npm run submit -- 'notes.txt'
```

### Verify notes were submitted.

The output will print X out of Y notes submitted but it might not be entirelly accurate, you can see for yourself which notes got submitted. There tends to be some failures when certain errors arise on the note submission page such as too many characters in a note or not providing required values such as language and concepts.

## Roadmap

I plan on updating the current features in order to fix any bugs that arise but so far I have working implementation of the parser and submitter. I plan on making a generator that will kind of copy the template and fill it out for you based on the required notes for a given date. This would make writting notes much easier but so far it hasn't been added.

- [x] Note Parser
- [x] Note Submitter
- [ ] Note Generator

## Technical Decisions

### Key Libraries Used

- Playwright (for automating submission).
- TypeScript (for types in my parser).
- dotenv (for reading .env file).

### Current bugs/limitations

- No private note.

There is a 'private note' section when submitting notes but currently this submitter and parser ignore it, its an optional field so I chose to not even include it but I might add in the future.

- Note failed to sumbit.

I tried to handle most of the errors and output a meaningful message but sometimes when the note fails to sumbit for reasons like no note found or no concepts it might not output the failure properly so just be sure to verify submission. If you come across something something that should be fix consider opening an issue.

- The security kind of feels weak.

Make sure you keep any .env files outside of version control! It's really risky keep credentials in a file like this so if you have any alternatives feel free to suggest them.

<!-- CONTRIBUTING -->

## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue.

Any contributions you make are **greatly appreciated**.

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- CONTACT -->

## Conclusion

Thank you for checking out my automated note submitter. I plan on maintaining this project for as long as I work at CoderSchool so any suggestions would be appreciated!

Thank you for your time,

- Kevin Barrios
