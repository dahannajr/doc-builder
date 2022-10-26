const Mustache = require('mustache');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require("fs").promises;
const _ = require('lodash');
const path = require('path');
const { config } = require('yargs');
const { write } = require('fs');

const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 --config-file [string] --output-folder [string] --markdown-template-folder [string] --overwrite-markdown [boolean]')
  .demandOption(['config-file', 'output-folder', 'markdown-template-folder', 'overwrite-markdown'])
  .argv;
const OUTPUT_FOLDER = argv['output-folder'];
const CONFIG_FILE = argv['config-file'];
let BUILD_CONFIG = {};

let markdownViews = {};
let mkdocsBuilderViews = {};

const writeFile = async (fullPath, content, overwrite) => {
  let fileStat;

  await makeDirectory(path.dirname(fullPath));

  try {
    fileStat = await fs.stat(`${fullPath}`);
  } catch (err) {
    // Nothing to do
  }

  if (!fileStat || overwrite) {
    await fs.writeFile(`${fullPath}`, content, { encoding: 'utf8' });
  }
}

const makeDirectory = async (directoryName) => {
  let directoryStat;

  try {
    directoryStat = await fs.stat(directoryName);
  } catch (err) {
    // Nothing to do
  }

  if (!directoryStat) {
    await fs.mkdir(`${directoryName}`, { recursive: true });
  }
}

const loadBuilderConfig = async () => {
  let stat = await fs.stat(CONFIG_FILE);
  if (stat && stat.isFile()) {
    let config = JSON.parse(await fs.readFile(CONFIG_FILE, { encoding: 'utf8' }));
    return config;
  } else {
    console.log(`Config file ${CONFIG_FILE} could not be located`);
    process.exit(1);
  }
}

const loadMarkdownMustacheViews = async (markdownTemplateFolder) => {
  try {
    let stat = await fs.stat(markdownTemplateFolder);
    if (stat && stat.isDirectory()) {
      const dir = await fs.opendir(markdownTemplateFolder);
      for await (const dirent of dir) {
        if (dirent.isFile()) {
          markdownViews[dirent.name] = await fs.readFile(`${markdownTemplateFolder}${dirent.name}`, { encoding: 'utf8' });
          console.log(`Read in Marked Mustache template: ${dirent.name}`);
        } else if (dirent.isDirectory()) {
          // TODO: Handle nested template directories
          console.error(`ERROR: Can't process nested template folders: ${dirent.name}`);
          process.exit(1);
        }
      }
    } else {
      console.log(`${markdownTemplateFolder} is not a directory`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1)
  }
}

const loadMkdocsBuilderMustacheViews = async (key, fileName) => {
  try {
    let stat = await fs.stat(fileName);
    if (stat && stat.isFile()) {
      mkdocsBuilderViews[key] = await fs.readFile(fileName, { encoding: 'utf8' });
    } else {
      console.log(`${fileName} is not a file`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1)

  }
}

const buildMkDocsYaml = async () => {
  let output = Mustache.render(mkdocsBuilderViews['mkdocsYamlView'], BUILD_CONFIG, {
    nav: mkdocsBuilderViews['navPartialView']
  });

  await writeFile(`${OUTPUT_FOLDER}/mkdocs.yml`, output, true);
}

const buildMarkdownContentFiles = async (navigationTree, spacing) => {
  for (const navigationItem of navigationTree) {
    if ('navigation' in navigationItem) {
      await buildMarkdownContentFiles(navigationItem['navigation'], spacing + 2);
    }
    if ('page' in navigationItem) {
      let fileName = navigationItem['page'];
      if (fileName.endsWith('index.md')) {
        console.log(spacing);
        navigationItem['spacing'] = '\n' + ' '.repeat(spacing) + '- ';
      } else {
        navigationItem['spacing'] = '';
      }

      let markdownTemplateView = `${navigationItem['template']}.mustache`;

      let output = Mustache.render(markdownViews[markdownTemplateView], navigationItem);

      await writeFile(`${OUTPUT_FOLDER}/docs/${fileName}`, output, _.lowerCase(argv['overwrite-markdown']) === "true");
    } else {
      navigationItem['page'] = '';
      navigationItem['spacing'] = '';
    }
  }
}

(async () => {
  BUILD_CONFIG = await loadBuilderConfig();

  await loadMarkdownMustacheViews(argv['markdown-template-folder']);

  await loadMkdocsBuilderMustacheViews('mkdocsYamlView', './templates/mustache/mkdocs.yaml.mustache');
  await loadMkdocsBuilderMustacheViews('navPartialView', './templates/mustache/partials/nav.mustache');

  if ('navigation' in BUILD_CONFIG) {
    await buildMarkdownContentFiles(BUILD_CONFIG['navigation'], 4);
  }

  await buildMkDocsYaml();

  if ('extraCss' in BUILD_CONFIG) {
    for await (const extraCss of BUILD_CONFIG['extraCss']) {
      let fromFile = `./templates/${extraCss}`;
      let toFile = `${OUTPUT_FOLDER}docs/${extraCss}`;
      await makeDirectory(path.dirname(toFile));
      await fs.copyFile(src = fromFile, dest = toFile);
    }
  }
})();