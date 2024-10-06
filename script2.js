import { Octokit } from "@octokit/core";
import env from "dotenv";
import fs from "fs";
import * as path from "path";
import result from "./results2.json" assert { type: "json" };
import yaml from "js-yaml";
import { execSync } from "child_process";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.cjs";
// Load environment variables
env.config();

const pathToDir = "/Users/umarmahmood/thesisWork/projects";
const langDetails = {};

const myExec = async function (command) {
  try {
    const stdout = execSync(command).toString();
    console.log("Success!! " + stdout);
  } catch (err) {
    console.error(err);
  }
};

const cleanProjects = function (pathDir) {
  const pathToFolder = fs.opendirSync(pathDir);
  let dirent;
  while ((dirent = pathToFolder.readSync()) !== null) {
    const fullPath = path.join(pathDir, dirent.name);
    if (fs.lstatSync(fullPath).isDirectory()) {
      fs.readdirSync(fullPath).forEach((entry) => {
        const entryPath = path.join(fullPath, entry);
        if (fs.lstatSync(entryPath).isDirectory() && entry !== ".github") {
          fs.rmdirSync(entryPath, { recursive: true });
        } else if (fs.lstatSync(entryPath).isFile()) {
          fs.unlinkSync(entryPath);
        }
      });
    }
  }
  pathToFolder.closeSync();
};
cleanProjects(pathToDir);
const cloneProjects = async function () {
  try {
    if (fs.existsSync(pathToDir)) {
      // console.log(`The file or directory at '${pathToDir}' exists.`);
      return;
    } else {
      const promisesRepos = result.items.slice(0, 100).map(async (item) => {
        await git.clone({
          fs,
          http,
          dir: `projects/${item.name.split("/")[1]}`,
          url: `https://github.com/${item.name}`,
          singleBranch: true,
          depth: 1,
          onAuth: () => ({
            username: "SHA256:qsDHrrGNUbrpPvJIZoXxUYzOS9LG7K1kaUw/lpawuO0",
          }),
        });
      });
      await Promise.all(promisesRepos);
      console.log("projects num: " + promisesRepos.length);
    }
  } catch (err) {
    console.log(err);
  }
};

cloneProjects();

result.items.forEach((object) => {
  if (!langDetails[object.mainLanguage]) {
    langDetails[object.mainLanguage] = { TotalRepo: 0, adopted: 0, names: [] };
  }
  langDetails[object.mainLanguage].TotalRepo++;
  langDetails[object.mainLanguage].names.push(object.name.split("/")[1]);
});

const dirNames = [];
const actions = [];
let counter = 0;
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

const gitHubActions = [];
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
      }
    });
  };
  readYAMLFilesRecursively(pathToFileOrDir);
};

downloadActions();

const pureActions = actions.map((action) =>
  action.replace(/\.yaml|\.yml/g, "")
);

function getActionsOcurrance() {
  const countOccurance = {};
  for (const action of pureActions) {
    const actionToLowerCase = action.toLowerCase();
    countOccurance[actionToLowerCase] = countOccurance[actionToLowerCase]
      ? countOccurance[actionToLowerCase] + 1
      : 1;
  }
  const countsArray = Object.entries(countOccurance);
  countsArray.sort((a, b) => b[1] - a[1]);

  const sortedCounts = Object.fromEntries(countsArray);
  console.log(sortedCounts.length);
}
getActionsOcurrance();

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

const allSteps = [];

const jobDetails = [];
const jobSet = new Set();
function getActionJobs() {
  const dir = fs.opendirSync(pathToDir);
  let projectsFolder;
  while ((projectsFolder = dir.readSync()) !== null) {
    let path = `${pathToDir}/${projectsFolder.name}/.github/workflows`;
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((dir) => {
        let filePath = `${path}/${dir}`;
        try {
          const data = yaml.load(fs.readFileSync(filePath, "utf8"));
          //console.log(Object.keys(data.jobs));
          jobSet.add(data.jobs);
          jobDetails.push(data.jobs);
        } catch (err) {
          console.error(err);
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
let totalJobs = 0;
const getJobsSteps = function () {
  jobDetails.forEach((job) => {
    console.log(job);
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
  // Object.keys(newObject).forEach(key => {
  //   newObject[key] = ((newObject[key] / lengthOfActions) * 100).toFixed(2)+ '%';
  // });
  //console.log(newObject)
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
//console.log("workflow files coumter: " + yamlFiles)
console.log(
  "Total number of projects who have adopted github actions: " + counter
);
console.log("Total number of workflows: " + gitHubActions.length);
console.log(
  "Average Number of Workflow Per Project is: " + gitHubActions.length / counter
);

//Average Number of jobs Per Workflow and Project,
console.log("Total jobs : " + totalJobs);
console.log("Total number of Jobs in all projects: " + jobDetails.length);
console.log("Total number of workflows: " + gitHubActions.length);
console.log(
  "Average Number of jobs Per Workflow: " +
    (jobDetails.length / gitHubActions.length).toFixed(2)
);

con;
// console.log(modifiedObject);
//console.log(marketPlaceActionObj)
// const doc = yaml.load(yamlContent);

//   // Access the steps within the jobs.build.steps array and extract the 'uses' field
//   const actionNames = doc.jobs.build.steps
//     .filter(step => step.uses)
//     .map(step => step.uses);
//console.log(contributerInAscending.slice(0,50))

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

// // // Calculate the adoption percentage for each language and add to the JSON object
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
// //-------------------------------------------------------------------------
// // Structure of adoptionRate in regard to stars data structure.
// // [chunck1],[chunch2],...,[chunck9]
// // [chunck1] = [[bar1], [bar2], [bar3], [bar4], [bar5]]
// // [bar1] = [{1},{2},{3},....{200}]

// const bufferingTheStaredArray = function () {
//   const chunckSize = 1000;
//   let chuncks = [];
//   while (starsInAsending.length > 0) {
//     const nextChunck = starsInAsending.splice(0, chunckSize);
//     chuncks.push(nextChunck);

//     // now we want to measure the adoption rate of nextChunk
//   }

//   //console.log("Chunks:", chuncks.length);
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
//     //console.log(`the true value in the ${i + 1}th bar` + adoptionCount);
//     adoptionCount = 0;
//   });
//   console.log(adoptionRate);
// };

// asscessAdoptionOfBars(barsFromChunksArray);

//21050 total num of actions
// average per project = totalNumOfProjectsAdoptedGA/TotalNumOfActions
// Mean is ?
