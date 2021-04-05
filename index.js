const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');

function parsePluginInfoComment(pluginFile) {
  const pluginFileContent = fs.readFileSync(pluginFile, 'utf8');
  const pluginInfoBlockRegex = /^<\?php\s*\/\*\s(.*?)\*\//s; // match <?php /*...*/
  const pluginInfoLineRegex = /^\s\*\s([\w\s]+):\s*(.*)/gm; // match * Some Field: value
  const regexResult = pluginInfoBlockRegex.exec(pluginFileContent);

  if (!(regexResult && regexResult[1])) {
      throw new Error(`Failed to parse plugin info comment block in ${pluginFile}`);
  }

  const parsedPluginInfo = [];
  let lineMatch = null;

  while (lineMatch = pluginInfoLineRegex.exec(regexResult[1])) {
    if (lineMatch[1] && lineMatch[2]) {
      parsedPluginInfo.push({
        name: lineMatch[1],
        value: lineMatch[2]
      });
    }
  }

  if (!parsedPluginInfo.length) {
    throw new Error(`Failed to parse plugin info lines in ${pluginFile}`);
  }

  const pluginInfo = {};
  for (const infoField of parsedPluginInfo) {
    let fieldKey = infoField.name.toLowerCase().replace(/\s/g, '_');
    pluginInfo[fieldKey] = infoField.value;
  }

  return pluginInfo;
}

function run() {
  try {
    const outputFile = core.getInput('output-file');
    const pluginName = core.getInput('plugin-name');
    const pluginFile = pluginName + '.php';
    const pluginInfo = parsePluginInfoComment(pluginFile);

    pluginInfo.last_updated = github.context.payload.head_commit.timestamp;
    pluginInfo.last_commit = github.context.sha;
    pluginInfo.build_number = github.context.run_number;
    pluginInfo.package_file = core.getInput('package-file');

    const pluginInfoJson = JSON.stringify(pluginInfo, undefined, 2);
    fs.writeFileSync(outputFile, pluginInfoJson);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
