import chai from "chai";
const { expect } = chai;

import { validBbox } from "../index";

describe("validBBOX", () => {
    describe("when bbox is a string", () => {
        it("returns a valid bbox", async () => {
            const bbox = "-122.09,39.89,-122.03,39.92"
            expect(validBbox(bbox)).to.equal(true);
        });
    });

    describe("when bbox is a string array", () => {
        it("returns a valid bbox", async () => {
            const bbox = ["-122.09","39.89","-122.03","39.92"]
            expect(validBbox(bbox)).to.equal(true);
        });
    });

    describe("when bbox is an invalid string array with negative numbers", () => {
        it("returns an invalid bbox", async () => {
            const bbox = ["-122.03","39.89","-122.09","39.92"]
            expect(validBbox(bbox)).to.equal(false);
        });
    });

    describe("when bbox is a number array", () => {
        it("returns a valid bbox", async () => {
            const bbox = [ -122.09, 39.89, -122.03, 39.92 ]
            expect(validBbox(bbox)).to.equal(true);
        });
    });

});