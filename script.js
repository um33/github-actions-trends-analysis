import { Octokit } from "octokit";
import env from "dotenv";
import fs, { lstatSync } from "fs";
import * as path from "path";
import result from "./results2.json" assert { type: "json" };
import yaml from "yaml";
import Yaml from "js-yaml";
import { exec, execSync } from "child_process";
import { assert, count, dir } from "console";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.cjs";
import Fs from "@supercharge/fs";
import nonClonedJson from "./nonClonedRepos.json" assert { type: "json" };
import remaningReposJson from "./RemainingRepos.json" assert { type: "json" };
env.config();

// Enviroment Variables
const pathToDir = process.env.PATH_TO_DIR;

// Global Variables
const dirNames = [];
const actions = [];
const gitHubActions = [];
const langDetails = {};
// const stars = {};
// const starsInAsending = [];
let counter = 0;

const myExec = async function (command) {
  try {
    execSync(command, (error, stdout, stderr) => {
      if (error) {
        console.log("error: " + error);
        return;
      }
      if (stderr) {
        console.log("stderr: " + stderr);
        return;
      }
      console.log("Success!! " + stdout);
    });
  } catch (err) {
    console.log(err);
  }
};

const writeDataToJson = function (filePath, arrayOfData) {
  fs.writeFileSync(filePath, JSON.stringify(arrayOfData), "utf8");
};

const cleanProjects = function (pathDir) {
  const dir = fs.opendirSync(pathDir);
  //Users/alaataleb/Desktop/githubAPI/projects/hhhh
  let pathToFolder;
  let repoFolders;
  let entryToRepo;
  while ((pathToFolder = dir.readSync()) !== null) {
    if (fs.lstatSync(pathToFolder.path).isDirectory()) {
      repoFolders = path.join(pathDir, pathToFolder.name);
      fs.readdirSync(repoFolders).forEach((entry) => {
        entryToRepo = path.join(repoFolders, entry);
        if (fs.lstatSync(entryToRepo).isDirectory() && entry !== ".github") {
          fs.rmdirSync(entryToRepo, { recursive: true, force: true });
        } else if (fs.lstatSync(entryToRepo).isFile()) {
          fs.unlinkSync(entryToRepo);
        }
      });
    }
  }
  dir.closeSync();
};

const cloneProjects = async function () {
  try {
    if (fs.existsSync(pathToDir)) {
      console.log(`The file or directory at '${pathToDir}' exists.`);
      return;
    } else {
      console.log(`The file or directory at '${pathToDir}' does not exist.`);
      //myExec("rm -rf projects && mkdir projects");
      remaningReposJson.forEach((item) => {
        myExec(
          `cd projects && git clone --depth 1 https://github.com/${item.name}`
        );
        cleanProjects(pathToDir);
      });
    }
  } catch (err) {
    console.log(err);
  }
};
cloneProjects();

// Populate tbe langDetails obj to be used to calc the adoption rate per language
const adotionRatePerLanguage = function () {
  result.items.forEach((item) => {
    if (!langDetails[item.mainLanguage]) {
      langDetails[item.mainLanguage] = {
        TotalRepo: 0,
        adopted: 0,
        names: [],
      };
    }
    langDetails[item.mainLanguage].TotalRepo++;
    langDetails[item.mainLanguage].names.push(item.name.split("/")[1]);
  });
};
adotionRatePerLanguage();

const downloadActions = function () {
  const dir = fs.opendirSync(pathToDir);
  let projectsFolder;
  let workflowsFolder;

  while ((projectsFolder = dir.readSync()) !== null) {
    dirNames.push(projectsFolder.name);
    workflowsFolder = `${pathToDir}/${projectsFolder.name}/.github/workflows`;

    if (fs.existsSync(workflowsFolder)) {
      Object.keys(langDetails).forEach((key) => {
        langDetails[key].names.forEach((repoName) => {
          if (repoName === projectsFolder.name) {
            langDetails[key].adopted++;
          }
        });
      });

      counter++;
      getActions(workflowsFolder);
    } else {
      //console.log(projectsFolder.name + " Do Not Have GitHub Actions");
    }
  }
  dir.closeSync();
};

let yamlCount = 0;
const getActions = function (pathToFileOrDir) {
  let secoundLastDir = "";
  const readYAMLFilesRecursively = (currentPath) => {
    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        secoundLastDir += entry.name + "/";
        // Recursively read files in subdirectory
        readYAMLFilesRecursively(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml"))
      ) {
        // Read and process YAML file
        const content = fs.readFileSync(fullPath, "utf8");
        actions.push(secoundLastDir + entry.name);
        gitHubActions.push(content);
        yamlCount++;
      }
    });
  };
  readYAMLFilesRecursively(pathToFileOrDir);
};

downloadActions();
console.log("COUNTER:", counter);
//--------------------------------------------------------------------------

const checkEmptyFolder = async function () {
  const dir = Fs.opendirSync(pathToDir);
  let dirent;
  let emp = 0;
  let rep = 0;
  let isEmpty;
  while ((dirent = dir.readSync()) !== null) {
    rep++;
    isEmpty = await Fs.isEmptyDir(path.join(dirent.path, dirent.name));
    if (isEmpty) {
      fs.rmdirSync(path.join(dirent.path, dirent.name), {
        recursive: true,
        force: true,
      });
    }
    emp++;
  }
  console.log("non-empty: ", emp);
  console.log("All repos: ", rep);
  dir.closeSync();
};
//checkEmptyFolder();

//--------------------------------------------------------------------------------------
// The below functions is the ones responsable for processing the data from the result array (the one containing the meta-data of our dataset) to put into a json files to plot it using a another script.

// The graphs this section is responseable for is:

// 1- Adoption to stars, forks, and contributors
// 2- TABLE I (in our thesis) COMPARISON OF CHARACTERISTICS FOR GITHUB REPOSITORIES WITH AND WITHOUT GA WORKFLOWS.

const stars = {};

const adoptionToParameters = function () {
  // loop through results json and populate the stars object
  result.items.forEach((item) => {
    if (!stars[item.name.split("/")[1]]) {
      stars[item.name.split("/")[1]] = {
        contributors: 0,
        name: "",
        adoptedGA: false,
      };
    }
    //stars[item.name.split("/")[1]].count += 1;
    stars[item.name.split("/")[1]].contributors = item.contributors;
    stars[item.name.split("/")[1]].name = item.name.split("/")[1];
  });
  // assign true if repos in Projects folder have adopted GA to stars onject
  let counter2 = 0;
  const dir = fs.opendirSync(pathToDir);
  let dirent;
  let workflowsFolder;
  let pathToFolder;

  while ((pathToFolder = dir.readSync()) !== null) {
    if (fs.lstatSync(pathToFolder.path).isDirectory()) {
      workflowsFolder = path.join(
        pathToDir,
        pathToFolder.name,
        "/.github/workflows"
      );
      if (fs.existsSync(workflowsFolder)) {
        counter2++;
        stars[pathToFolder.name].adoptedGA = true;
      }
    }
  }
  dir.closeSync();

  const starsInAsending = Object.values(stars).sort(
    (a, b) => a.contributors - b.contributors
  );

  return starsInAsending;
};

const starsInAsending = adoptionToParameters();
//console.log(starsInAsending);

const dataToJson = {};

const bufferingTheStaredArray = function (starsInAscending) {
  const chunkSize = 1000;
  let chunks = [];
  for (let start = 0; start < starsInAscending.length; start += chunkSize) {
    const nextChunk = starsInAscending.slice(start, start + chunkSize);
    chunks.push(nextChunk);
  }

  return chunks;
};

const chunkedArray = bufferingTheStaredArray(starsInAsending);

const splitIntoBars = function (chunkArray) {
  let barSize = 200;
  let bars = [];
  chunkArray.forEach((chunk) => {
    if (!dataToJson[chunk[0].contributors]) {
      dataToJson[chunk[0].contributors] = {};
    }
    for (let start = 0; start < chunk.length; start += barSize) {
      const nextBar = chunk.slice(start, start + barSize);
      bars.push(nextBar);
      // console.log(
      //   "tests with bars:",
      //   nextBar.length,
      //   "first-element:",
      //   nextBar[0].contributors
      // );
      const avg =
        nextBar.reduce((sum, j) => sum + j.contributors, 0) / nextBar.length;
      if (!dataToJson[chunk[0].contributors][`bar ${bars.length}`]) {
        dataToJson[chunk[0].contributors][`bar ${Math.round(avg)}`] = {
          adoptionRate: 0,
        };
      }
    }
  });
  return bars;
};

let adoptionRates = [];
const barsFromChunksArray = splitIntoBars(chunkedArray);

const asscessAdoptionOfBars = function (barsArray) {
  let adoptionCount = 0;
  let allRepos = 0;
  //console.log("barsArray:", barsArray);
  barsArray.forEach((bar, i) => {
    bar.forEach((column) => {
      if (column.adoptedGA) {
        adoptionCount++;
      }
    });

    const adoptionPrecentage = Math.trunc((adoptionCount / bar.length) * 100);
    adoptionRates.push(adoptionPrecentage);
    bar[`bar${i + 1}`];
    //console.log(`the true value in the ${i + 1}th bar` + adoptionCount);
    adoptionCount = 0;
  });
};

asscessAdoptionOfBars(barsFromChunksArray);

Object.values(dataToJson).forEach((item, i) => {
  Object.values(item).forEach((obj, j) => {
    obj.adoptionRate = adoptionRates[i * 5 + j];
  });
});

// writeDataToJson(
//   "/Users/alaataleb/Desktop/githubAPI/newChunkContributors.json",
//   dataToJson
// );

// The above  functions is the ones responsable for processing the data from the result array (the one containing the meta-data of our dataset) to put into a json files to plot it using a another script.

// The graphs this section is responseable for is:

// 1- Adoption to stars, forks, and contributors
// 2- TABLE I (in our thesis) COMPARISON OF CHARACTERISTICS FOR GITHUB REPOSITORIES WITH AND WITHOUT GA WORKFLOWS.
//---------------------------------------------------------------------------------------------------------------------------------------------------------

// Calculate the adoption percentage for each language and add to the JSON object
const languageStatistics = {};

const extractAdoptionRatePerLanguage = function () {
  Object.entries(langDetails).forEach(([language, details]) => {
    const adoptionRate = Math.trunc(
      (details.adopted / details.TotalRepo) * 100
    );
    languageStatistics[language] = {
      adoptionPercentage: adoptionRate,
      totalProjects: Math.round((details.TotalRepo / 5583) * 100),
    };
  });
  const filePath = "/Users/alaataleb/Desktop/githubAPI/languge_adoption2.json";
  try {
    if (fs.existsSync(filePath)) return;
    myExec("touch languge_adoption2.json");
    fs.writeFileSync(
      filePath,
      JSON.stringify(languageStatistics, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error(err);
  }
};
extractAdoptionRatePerLanguage();

// Calculate the adoption percentage for each language and add to the JSON object

//------------------------------Logging to Confirm Result of Adoptionate RQ1:-------------------------------------------------------

// console.log("result length:", result.items.length);
// console.log("dirName Length:", dirNames.length);
// // // //console.log("nonClonedRepos:", nonClonedRepos.length);
// console.log("Adoption rate Array: ", adoptionRates);
// // Total of 9115 repos in results2
// console.log("Total Number of Cloned Repos: " + dirNames.length);
// console.log("----------------------------------------------------------------");
// console.log(
//   Math.trunc((counter / dirNames.length) * 100) +
//     "% of our dataset have adopted GA"
// );
// // console.log("Actions:", actions);
// console.log("----------------------------------------------------------------");
// console.log(Object.keys(langDetails));
// console.log("----------------------------------------------------------------");

// Object.entries(langDetails).forEach((entry) => {
//   console.log(
//     Math.trunc((entry[1].adopted / entry[1].TotalRepo) * 100) +
//       `% of ${entry[0]} projects in our dataset have adopted GA`
//   );
// });
// console.log("Total Num Of Projs That Adapted GA:", counter);
// console.log("Total Num Of Actions:", yamlCount);
// console.log("Average Workflows Per Project:", (yamlCount / counter).toFixed(2));

// console.log(inspect(langDetails, { maxArrayLength: null }));

//---------------------------------------------------CodeForRQ2----------------------------------------------------------------
// array of names
// want to iterate throug each name and put in an object
// loop through the obj keys and put togather ever obj that matches the most popular objects if it includes some of it if its popular names.
// present the results

// We have an array of yaml file we want to take the most popular categories among those files
// We want increse by one for each occurense of those cats
const pureActions = actions.map((action) => action.replace(/.yaml|.yml/g, ""));

const popularCategories = [
  "ci",
  "release",
  "build",
  "test",
  "codeql",
  "stale",
  "main",
  "lint",
  "publish",
  "docs",
  "deploy",
  "docs",
  "label",
  "backport",
];

function getActionsOcurrance() {
  const counts = {};

  // intilize the counts object for every cat in popularcats array
  popularCategories.forEach((category) => {
    counts[category] = { sumOfCategoryType: 0, precentageOfOccurence: 0 };
  });

  // Increment the counts obj by one for every action the include one or more cats of the popular cats array
  const updateCounts = (word) => {
    const toLower = word.toLowerCase();
    const categories = popularCategories.filter((c) => toLower.includes(c));
    if (categories.length > 0) {
      categories.forEach((category) => {
        counts[category].sumOfCategoryType++;
        counts[category].precentageOfOccurence = (
          (counts[category].sumOfCategoryType / pureActions.length) *
          100
        ).toFixed(2);
      });
    } else {
    }
  };

  // count the most popular cats by passing the actions to the updateCounts method
  pureActions.forEach((word) => updateCounts(word));

  // Sort the counts obj in decendent order to show the most popular categories
  const countsArray = Object.entries(counts);
  countsArray.sort((a, b) => b[1].sumOfCategoryType - a[1].sumOfCategoryType);
  const sortedCounts = Object.fromEntries(countsArray);

  console.log(sortedCounts);
}
getActionsOcurrance();

console.log("pureAction:", pureActions.length);

const repoContributer = {};
let contributerInAscending = [];

function contributerAffect() {
  result.items.forEach((item) => {
    const repoName = item.name.split("/")[1];
    if (!repoContributer[repoName]) {
      repoContributer[repoName] = {
        contributerSize: 0,
        name: "",
        adoptedGA: false,
      };
    }
    repoContributer[repoName].contributerSize = item.contributors;
    repoContributer[repoName].name = item.name.split("/")[1];
  });
}
contributerAffect();
contributerInAscending = Object.values(repoContributer);
contributerInAscending.sort((a, b) => a.contributors - b.contributors);
//console.log("contri:", contributerInAscending);

const allSteps = [];

const jobDetails = [];
const jobSet = new Set();
const jobInsideWorkflows = [];
function getActionJobs() {
  const dir = fs.opendirSync(pathToDir);
  let projectsFolder;
  while ((projectsFolder = dir.readSync()) !== null) {
    let path = `${pathToDir}/${projectsFolder.name}/.github/workflows`;
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((dir) => {
        let filePath = `${path}/${dir}`;
        try {
          const data = Yaml.load(fs.readFileSync(filePath, "utf8"));
          //console.log(Object.keys(data.jobs));
          jobInsideWorkflows.push(Object.keys(data.jobs));
          jobSet.add(data.jobs);
          jobDetails.push(data.jobs);
        } catch (err) {
          //console.error(err);
        }
      });
    }
  }
}
getActionJobs();
const runsOnArray = [];
const runsOnSet = new Set();
const modifiedActions = [];
const actionsSet = new Set();
const steps = [];
const stepsInsideJobs = [];
let totalJobs = 0;
const getJobsSteps = function () {
  jobDetails.forEach((job) => {
    totalJobs++;
    const keys = Object.keys(job ?? {});
    keys.forEach((key) => {
      steps.push(job[key].steps);
      runsOnArray.push(job[key]["runs-on"]);
      runsOnSet.add(job[key]["runs-on"]);
    });
  });
  const arr = steps;
  const arr2 = runsOnArray;
  arr2.flat(Infinity).forEach((run) => {
    runsOnSet.add(run);
  });
  arr.flat(Infinity).forEach((indx) => {
    allSteps.push(indx);
    if (indx?.uses) {
      modifiedActions.push(indx.uses);
      actionsSet.add(indx.uses);
    }
  });
};
getJobsSteps();
//The size of this set is 1456
//console.log("runsOn set:", runsOnSet.size)
//The size of this array is 36856
const stringfyArray = [];
runsOnArray.forEach((indx) => {
  if (typeof indx != "string") {
    const newindx = `${indx}`;
    stringfyArray.push(newindx);
    //console.log(newindx)
  } else {
    stringfyArray.push(indx);
  }
});

console.log("runsOn: " + stringfyArray.length);
// console.log("steps:",steps.length)
// console.log("allSteps:", allSteps.length)

const marketPlaceActions = modifiedActions.map((action) => {
  const index = action.indexOf("@");
  return index !== -1 ? action.substring(0, index) : action;
});

const lengthOfActions = marketPlaceActions.length;
//36856
//console.log("length of the steps " + steps.length)
const marketPlaceActionObj = {};
const mostCommonMarketPlaceActions = function () {
  for (const action of marketPlaceActions) {
    marketPlaceActionObj[action] = marketPlaceActionObj[action]
      ? marketPlaceActionObj[action] + 1
      : 1;
  }
  const sortedMarketPlaceActionObj = Object.entries(marketPlaceActionObj).sort(
    (a, b) => b[1] - a[1]
  );
  const newObject = Object.fromEntries(sortedMarketPlaceActionObj.slice(0, 10));
  Object.keys(newObject).forEach((key) => {
    newObject[key] =
      ((newObject[key] / lengthOfActions) * 100).toFixed(2) + "%";
  });
  console.log(newObject);
};
mostCommonMarketPlaceActions();

let selfHostCount = 0;
let ubuntuCount = 0;
let windowsCount = 0;
let macOSCount = 0;
let matrixCount = 0;
const runOnObj = {};

const runsOn = function () {
  stringfyArray.forEach((runsOn) => {
    if (runsOn.includes("matrix") && !runsOn.includes("self-hosted")) {
      matrixCount++;
    } else if (runsOn.includes("ubuntu") && !runsOn.includes("self-hosted")) {
      ubuntuCount++;
    } else if (runsOn.includes("windows") && !runsOn.includes("self-hosted")) {
      windowsCount++;
    } else if (runsOn.includes("macOS") && !runsOn.includes("self-hosted")) {
      macOSCount++;
    } else {
      selfHostCount++;
    }
  });

  runOnObj["self-host"] = selfHostCount;
  runOnObj["ubuntu"] = ubuntuCount;
  runOnObj["windows"] = windowsCount;
  runOnObj["macOS"] = macOSCount;
  runOnObj["matrix"] = matrixCount;

  const sortedRunOnArray = Object.entries(runOnObj).sort((a, b) => b[1] - a[1]);
  const newObject = Object.fromEntries(sortedRunOnArray.slice(0, 10));
  const lengthOfActions = stringfyArray.length;

  Object.keys(newObject).forEach((key) => {
    newObject[key] =
      ((newObject[key] / lengthOfActions) * 100).toFixed(2) + "%";
  });

  return newObject;
};

console.log(runsOn());

//Average Number of Workflow Per Project, Average Number of jobs Per Workflow and Project,
//and Average Number of Steps Per Job, WorkFlow and Projects.
//console.log("workflow files coumter: " + yamlFiles);

const arrJobs = [];
const arrDetails = [];
const jobsPerWorkflowCounter = function () {
  jobDetails.forEach((job) => {
    if (job == null) {
      console.log("NO JOBS HERE!!");
      //console.log(job);
    } else {
      arrJobs.push(Object.keys(job));
      arrDetails.push(Object.values(job));
    }
  });
};
jobsPerWorkflowCounter();

const stepsCounter = [];
const constractStepsFromWorkflows = function () {
  arrDetails.flat().forEach((entry) => {
    stepsCounter.push(entry.steps);
  });
};
constractStepsFromWorkflows();
let eventArray = [];
let countIndented = 0;
const commonEvents = {};
const extractEvents = function () {
  let loadedAction;
  gitHubActions.forEach((action) => {
    try {
      const x = Yaml.load(action).on;
      if (!Array.isArray(x)) {
        if (typeof x === "object" && x != null) {
          Object.keys(x).forEach((k) => eventArray.push(k));
        } else if (x != null) {
          eventArray.push(x);
        }
        //console.log("arr", Object.keys(Yaml.load(action).on)[0]);
      } else {
        // Object.keys(Yaml.load(action).on).forEach((en) => eventArray.push(en));
        x.forEach((en) => {
          eventArray.push(en);
        });

        //console.log(Yaml.load(action).on);
      }
    } catch (err) {
      countIndented++;
    }
  });
  const flated = eventArray.flat(Infinity);
  console.log(flated.slice(0, 20));
  let popularEvents = [];

  flated.forEach((ev) => {
    if (!commonEvents[ev]) {
      commonEvents[ev] = {
        total: 0,
        percentage: 0,
      };
    }
    commonEvents[ev].total++;
    commonEvents[ev].percentage = (
      (commonEvents[ev].total / eventArray.length) *
      100
    ).toFixed(2);
  });

  const countsArray = Object.entries(commonEvents);
  countsArray.sort((a, b) => b[1].total - a[1].total);
  const sortedCounts = Object.fromEntries(countsArray);
  //console.log(countsArray.slice(0, 20));

  //console.log(sortedCounts);
};
extractEvents();

console.log("Bad indented count:", countIndented);

console.log(
  "---------------------------------GENERAL-VALUES-----------------------------------------------"
);
console.log(
  "Total number of projects who have adopted github actions: " + counter
);
console.log("Total number of workflows: " + gitHubActions.length);
console.log("Total Number Of Jobs:", arrJobs.flat().length);
console.log("Total Number Of Steps:", stepsCounter.flat().length);
console.log(
  "-----------------------------------------Workflows---------------------------------------------"
);
console.log(
  "Average Number of Workflow Per Project is: " +
    (gitHubActions.length / counter).toFixed(2)
);
console.log(
  "-----------------------------------------Jobs--------------------------------------------------"
);
console.log(
  "Average Number Of Jobs per Workflow:",
  (arrJobs.flat().length / gitHubActions.length).toFixed(2)
);
console.log(
  "Average Number Of Jobs per Project:",
  (arrJobs.flat().length / counter).toFixed(2)
);
console.log(
  "-----------------------------------------Steps--------------------------------------------------"
);
console.log(
  "Average Number Of Steps per Job:",
  (stepsCounter.flat().length / arrJobs.flat().length).toFixed(2)
);
console.log(
  "Average Number Of Steps per Workflow:",
  (stepsCounter.flat().length / gitHubActions.length).toFixed(2)
);
console.log(
  "Average Number Of Steps per Project:",
  (stepsCounter.flat().length / counter).toFixed(2)
);

//console.log("Details:", arrDetails.flat());

//Average Number of jobs Per Workflow and Project,

//console.log(modifiedObject);
//console.log(marketPlaceActionObj);
// const doc = yaml.load(yamlContent);

// //Access the steps within the jobs.build.steps array and extract the 'uses' field
// const actionNames = doc.jobs.build.steps
//   .filter((step) => step.uses)
//   .map((step) => step.uses);
// console.log(contributerInAscending.slice(0, 50));

// console.log("Total Number of Cloned Repos: " + dirNames.length);
// console.log("----------------------------------------------------------------");
// console.log(
//   Math.trunc((counter / dirNames.length) * 100) +
//     "% of our dataset have adopted GA"
// );
// console.log("----------------------------------------------------------------");
// console.log(Object.entries(langDetails)[0]);
// console.log("----------------------------------------------------------------");

// Object.entries(langDetails).forEach((entry) => {
//   console.log(
//     `${Math.trunc((entry[1].adopted / entry[1].TotalRepo) * 100)}% of ${entry[0]} projects in our dataset have adopted GA out of ${entry[1].TotalRepo} total ${entry[0]} projects`
//   );
// });

//console.log(inspect(langDetails, { maxArrayLength: null }));

//  const languageStatistics = {};

// Calculate the adoption percentage for each language and add to the JSON object
// Object.entries(langDetails).forEach(([language, details]) => {
//   const adoptionRate = Math.trunc((details.adopted / details.TotalRepo) * 100);
//   languageStatistics[language] = {
//     adoptionPercentage: adoptionRate,
//     totalProjects: details.TotalRepo,
//   };
// });
// const dirname = "/Users/umarmahmood/thesisWork"
// const filePath = path.join(dirname, 'language_adoption.json');
// fs.writeFileSync(filePath, JSON.stringify(languageStatistics, null, 2), 'utf8');

// console.log('Language adoption statistics saved to ' + filePath);

// const stars = {};
// let starsInAsending = [];
// const adoptionToParameters = function () {
//   let counter2 = 0;
//   result.items.sort((a, b) => a.stargazers - b.stargazers);
//   result.items.map((item) => {
//     if (!stars[item.name.split("/")[1]]) {
//       stars[item.name.split("/")[1]] = { stars: 0, name: "", adoptedGA: false };
//     }
//     //stars[item.name.split("/")[1]].count += 1;
//     stars[item.name.split("/")[1]].stars = item.stargazers;
//     stars[item.name.split("/")[1]].name = item.name.split("/")[1];
//   });

//   starsInAsending = Object.values(stars);

//   const dir = fs.opendirSync(pathToDir);
//   let dirent;
//   let workflowsFolder;
//   let pathToFolder;

//   while ((pathToFolder = dir.readSync()) !== null) {
//     console.log(pathToFolder);
//     if (fs.lstatSync(pathToFolder).isDirectory()) {
//       workflowsFolder = path.join(
//         pathToDir,
//         pathToFolder.name,
//         "/.github/workflows"
//       );
//       if (fs.existsSync(workflowsFolder)) {
//         counter2++;
//         stars[pathToFolder.name].adoptedGA = true;
//       }
//     }
//   }
//   console.log("Count", counter2);
// };
// adoptionToParameters();
// let countTrue = 0;
// starsInAsending.forEach((obj) => console.log(countTrue++));
// console.log("Count True: ", countTrue);
//-------------------------------------------------------------------------
// Structure of adoptionRate in regard to stars data structure.
// [chunck1],[chunch2],...,[chunck9]
// [chunck1] = [[bar1], [bar2], [bar3], [bar4], [bar5]]
// [bar1] = [{1},{2},{3},....{200}]

// const bufferingTheStaredArray = function () {
//   const chunckSize = 1000;
//   let chuncks = [];
//   while (starsInAsending.length > 0) {
//     const nextChunck = starsInAsending.splice(0, chunckSize);
//     chuncks.push(nextChunck);

// now we want to measure the adoption rate of nextChunk
//   }

//console.log("Chunks:", chuncks.length);
//   return chuncks;
// };

// const chunckArray = bufferingTheStaredArray();
// const newChunkArray = chunckArray;
// //console.log("newChunkArray  " + newChunkArray);

// const splitingIntoBars = function (chnckArray) {
//   let barSize = 200;
//   let bars = [];
//   chnckArray.forEach((chunck) => {
//     while (chunck.length > 0) {
//       const nextBar = chunck.splice(0, barSize);
//       bars.push(nextBar);
//     }
//   });
//   return bars;
// };
// let adoptionRate = [];
// const barsFromChunksArray = splitingIntoBars(chunckArray);
// const asscessAdoptionOfBars = function (barsArray) {
//   let adoptionCount = 0;
//   let allRepos = 0;

//   barsArray.forEach((bar, i) => {
//     bar.forEach((column) => {
//       if (column.adoptedGA) {
//         adoptionCount++;
//       }
//     });
//     const adoptionPrecentage = Math.trunc((adoptionCount / bar.length) * 100);
//     adoptionRate.push(adoptionPrecentage);
//console.log(`the true value in the ${i + 1}th bar` + adoptionCount);
//     adoptionCount = 0;
//   });
//   console.log(adoptionRate);
// };

// asscessAdoptionOfBars(barsFromChunksArray);

//21050 total num of actions
// average per project = totalNumOfProjectsAdoptedGA/TotalNumOfActions
// Mean is ?
// console.log("Dir Names: ", dirNames.slice(0, 10));

// const matchResultWithProjectFolder = function () {
//   let count = 0;
//   result.items.forEach((item) => {
//     const pathToProjectsNames = `${pathToDir}/projects/${
//       item.name.split("/")[1]
//     }`;
//     if (!fs.existsSync(pathToProjectsNames)) {
//       count++;
//     }
//   });
//   console.log("count:", count);
// };
// matchResultWithProjectFolder();

//extractingRunsOnEnv();
// gitHubActions.forEach((workflow) => {
//   if (workflow?.jobs) {
//     console.log(workflow.jobs["runs-on"]);
//   } else {
//     console.log(workflow["runs-on"]);
//   }
// });
//-------------------------------Writing to dataToJson to Plot it.--------------------------------------------------------------
// console.log("Data:", dataToJson);

// writeDataToJson(
//   "/Users/alaataleb/Desktop/githubAPI/language_adoptionNew.json",
//   dataToJson
// );
//--------------------------------------------------------------------------------------------------------------------------------

//------------------------------------TheThingsThisScriptDO---------------------------------------------------------------------//

//----------------------------------------UnusedCodeArea------------------------------------------------------------------------//

// Asyncronoues code snipet
// const promisesRepos = result.items.slice(0, 1000).map((item) => {
//   return git
//     .clone({
//       fs,
//       http,
//       dir: `projects/${item.name.split("/")[1]}`,3 sxz
//       url: `https://github.com/${item.name}`,
//       singleBranch: true,
//       depth: 1,
//       onAuth: () => ({ username: process.env.GITHUB_API_TOKEN }),
//     })
//     .catch((err) => {
//       console.error(`Failed to clone ${item.name}: ${err.message}`);
//     });
// });
// console.log(`Starting the cloning of ${promisesRepos.length} projects.`);

// await Promise.all(promisesRepos);
// console.log("All projects cloned.");

// const counts = {};
// popularCategories.forEach((category) => {
//   counts[category] = { sumOfCategoryType: 0, precentageOfOccurence: 0 };
// });
// const updateCounts = (word) => {
//   const toLower = word.toLowerCase();
//   popularCategories.forEach((category) => {
//     if (toLower.includes(category)) {
//       counts[category].sumOfCategoryType++;
//       counts[category].precentageOfOccurence = (
//         (counts[category].sumOfCategoryType / pureActions.length) *
//         100
//       ).toFixed(2);
//     }
//     // else {
//     //   counts[category] = { sumOfCategoryType: 0, precentageOfOccurence: 0 };
//     // }
//   });
// };

// pureActions.forEach((word) => updateCounts(word));
// const countsArray = Object.entries(counts);
// countsArray.sort((a, b) => b[1].sumOfCategoryType - a[1].sumOfCategoryType);
// const sortedCounts = Object.fromEntries(countsArray);
// console.log(sortedCounts);

// console.log("pureAct:", pureActions.slice(0, 100));
