const $RefParser = require('@apidevtools/json-schema-ref-parser');
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Expects two arguments: source schema file and output file');
  process.exit(1);
}

const [sourceSchemaFile, outputFile] = args;

(async () => {
  const derefed = await $RefParser.dereference(sourceSchemaFile, {
    dereference: {
      circular: 'ignore'
    }
  });
  await writeFile(outputFile, JSON.stringify(derefed, null, 2));
})()
  .then(() => {
    console.log(`Output ${outputFile}`);
  }).catch((error) => {
    console.log(error);
    process.exit(1);
  });
