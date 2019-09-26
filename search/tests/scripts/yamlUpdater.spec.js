const fs = require('fs');
const yaml = require('js-yaml');
const {
  STACYamlUrl,
  WFS3YamlUrl,
  retrieveYaml,
  mergeObjects,
  loadAndMergeYamlFiles,
  writeToYaml,
  updateYaml
} = require('../../scripts/yamlUpdater.js');

describe('yamlUpdater', () => {
  describe('retrieveYaml', () => {
    it('should throw if missing url.', () => {
      expect(retrieveYaml()).rejects.toThrow();
    });

    it('should return an object', async () => {
      const response = await retrieveYaml(WFS3YamlUrl);
      expect(typeof response).toBe('object');
    });

    it('should return the unique data from the given url', async () => {
      const response = await retrieveYaml(WFS3YamlUrl);
      expect(response.info.title).toBe('OGC API - Features - Part 1: Core');
    });
  });

  describe('mergeObject', () => {
    const testStacObj = { test: 'test' };
    const testWfs3Obj = {
      test: 'old test',
      word: 'anotherWord'
    };

    it('requires two objects as parameters', () => {
      expect(() => mergeObjects()).toThrow();
      expect(() => mergeObjects(testStacObj)).toThrow();
    });

    it('should return the merged object', () => {
      const newObject = mergeObjects(testStacObj, testWfs3Obj);
      expect(newObject).toEqual({
        test: 'test',
        word: 'anotherWord'
      });
    });
  });

  describe('loadAndMergeYamlFiles', () => {
    it('must take in two urls as parameters', () => {
      expect(loadAndMergeYamlFiles()).rejects.toThrow('Must pass two yaml urls');
    });

    it('should return a merged yaml object', async () => {
      const testYamlString = await loadAndMergeYamlFiles(STACYamlUrl, WFS3YamlUrl);
      expect(typeof testYamlString).toEqual('string');
    });
  });

  describe('writeToYaml', () => {
    const testPath = './docs/test.yaml';
    const testYamlString = 'this is a yaml string';

    it('should require a yaml string and a path string', () => {
      expect(() => writeToYaml()).toThrow('Must pass a yaml string and a path string');
      expect(() => writeToYaml(testYamlString)).toThrow('Must pass a yaml string and a path string');
    });

    it('should write to a file', () => {
      writeToYaml(testYamlString, testPath);
      const testFileContents = yaml.safeLoad(fs.readFileSync('./docs/test.yaml'));
      expect(testFileContents).toEqual('this is a yaml string');
      fs.unlinkSync(testPath);
    });
  });

  describe('updateYaml', () => {
    const testYamlUrl1 = 'http://www.example.com';
    const testYamlUrl2 = 'http://www.moreexamples.com';

    it('needs to receive two yaml urls and a path', () => {
      expect(updateYaml()).rejects.toThrow('Missing at least one parameter, check parameters and try again');
      expect(updateYaml(testYamlUrl1)).rejects.toThrow('Missing at least one parameter, check parameters and try again');
      expect(updateYaml(testYamlUrl1, testYamlUrl2)).rejects.toThrow('Missing at least one parameter, check parameters and try again');
    });

    it('should create a new yaml file', async () => {
      await updateYaml(STACYamlUrl, WFS3YamlUrl, './docs/WFS3core+STAC.yaml');
    });
  });
});
