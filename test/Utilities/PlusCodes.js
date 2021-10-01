const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const PlusCodes = artifacts.require('PlusCodesMock');

contract('PlusCodes', function (accounts) {
  beforeEach(async function () {
    this.plusCodes = await PlusCodes.new();
  });

  describe('getParent', async function () {
    async function checkExpectedParent (plusCodes, childCodeASCII, parentCodeASCII) {
      const childCode = new BN(Buffer.from(childCodeASCII).toString('hex'), 16);
      const parentCode = new BN(Buffer.from(parentCodeASCII).toString('hex'), 16);
      expect(await plusCodes.getParent(childCode)).to.bignumber.equal(parentCode);
    }

    it('gets parent of a code length 4 Plus Code', async function () {
      await checkExpectedParent(this.plusCodes, '22220000+', '22000000+');
    });

    it('gets parent of a code length 6 Plus Code', async function () {
      await checkExpectedParent(this.plusCodes, '22222200+', '22220000+');
    });

    it('gets parent of a code length 8 Plus Code', async function () {
      await checkExpectedParent(this.plusCodes, '22222222+', '22222200+');
    });

    it('gets parent of a code length 10 Plus Code', async function () {
      await checkExpectedParent(this.plusCodes, '22222222+22', '22222222+');
    });

    it('gets parent of a code length 11 Plus Code', async function () {
      await checkExpectedParent(this.plusCodes, '22222222+222', '22222222+22');
    });

    it('gets parent of a code length 12 Plus Code', async function () {
      await checkExpectedParent(this.plusCodes, '22222222+2222', '22222222+222');
    });

    it('reverts when trying to get parent of code length 2 Plus Code', async function () {
      const childCodeASCII = '22000000+';
      const childCode = new BN(Buffer.from(childCodeASCII).toString('hex'), 16);
      await expectRevert(this.plusCodes.getParent(childCode), 'Code length 2 Plus Codes do not have parents');
    });

    it('reverts when trying to get parent of invalid Plus Code', async function () {
      const childCodeASCII = '2222BEER+';
      const childCode = new BN(Buffer.from(childCodeASCII).toString('hex'), 16);
      await expectRevert(this.plusCodes.getParent(childCode), 'Not a valid Plus Codes digit');
    });
  });

  describe('getChildTemplate/getNthChildFromTemplate', async function () {
    async function checkValidChild (plusCodes, parentCodeASCII) {
      const parentCode = new BN(Buffer.from(parentCodeASCII).toString('hex'), 16);
      const childTemplate = await plusCodes.getChildTemplate(parentCode);
      const [, childCount] = childTemplate;
      const childIndex = Math.floor(Math.random() * childCount);
      const childCode = await plusCodes.getNthChildFromTemplate(childIndex, childTemplate);
      const roundTripParent = await plusCodes.getParent(childCode);
      expect(roundTripParent).to.bignumber.equal(parentCode);
    }

    it('gets a valid child of a code length 2 Plus Code', async function () {
      await checkValidChild(this.plusCodes, '24000000+');
    });

    it('gets a valid child of a code length 4 Plus Code', async function () {
      await checkValidChild(this.plusCodes, '24550000+');
    });

    it('gets a valid child of a code length 6 Plus Code', async function () {
      await checkValidChild(this.plusCodes, '2455CC00+');
    });

    it('gets a valid child of a code length 8 Plus Code', async function () {
      await checkValidChild(this.plusCodes, '2455CCXX+');
    });

    it('gets a valid child of a code length 10 Plus Code', async function () {
      await checkValidChild(this.plusCodes, '2455CCXX+22');
    });

    it('gets a valid child of a code length 11 Plus Code', async function () {
      await checkValidChild(this.plusCodes, '2455CCXX+223');
    });

    it('reverts when trying to get a child of code length 12 Plus Code', async function () {
      const parentCodeASCII = '22223333+2233';
      const parentCode = new BN(Buffer.from(parentCodeASCII).toString('hex'), 16);
      await expectRevert(this.plusCodes.getChildTemplate(parentCode), 'greater than 12 not supported');
    });

    it('reverts when trying to get child of invalid Plus Code', async function () {
      const parentCodeASCII = '2222BEER+';
      const parentCode = new BN(Buffer.from(parentCodeASCII).toString('hex'), 16);
      await expectRevert(this.plusCodes.getChildTemplate(parentCode), 'Not a valid Plus Codes digit');
    });
  });

  describe('toString, fromString', async function () {
    async function checkToFromString (plusCodes, plusCodeASCII) {
      const plusCode = new BN(Buffer.from(plusCodeASCII).toString('hex'), 16);
      const roundTripString = await plusCodes.methods['toString(uint256)'](plusCode);
      const threeWay = await plusCodes.fromString(roundTripString);
      expect(roundTripString).to.equal(plusCodeASCII);
      expect(threeWay).to.bignumber.equal(plusCode);
    }

    it('converts a code length 2 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '24000000+');
    });

    it('converts a code length 4 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '24330000+');
    });

    it('converts a code length 6 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '23456700+');
    });

    it('converts a code length 8 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '23456789+');
    });

    it('converts a code length 10 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '23456789+CF');
    });

    it('converts a code length 11 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '23456789+CFG');
    });

    it('converts a code length 12 Plus Code to a string', async function () {
      await checkToFromString(this.plusCodes, '23456789+CFGH');
    });

    it('reverts when trying to convert invalid Plus Code', async function () {
      const invalidCodeASCII = '2222BEER+';
      const invalidCode = new BN(Buffer.from(invalidCodeASCII).toString('hex'), 16);
      await expectRevert(this.plusCodes.methods['toString(uint256)'](invalidCode), 'Not a valid Plus Codes digit');
    });
  });

  describe('getNthCodeLength4CodeNotNearPoles', async function () {
    function isAValidCodeLength4PlusCode (plusCodeASCII) {
      // See https://github.com/google/open-location-code
      const regexp = /^[2-9C][[2-9CFGHJMPQRV][2-9CFGHJMPQRVWX]{2}0000\+$/;
      return regexp.test(plusCodeASCII);
    }

    function isNearPoles (plusCodeASCII) {
      // See https://github.com/google/open-location-code
      const regexp = /^[23C]/;
      return regexp.test(plusCodeASCII);
    }

    before(async function () {
      this.allCodeLength4CodeNotNearPoles = [];
      // for (let n = 1; n <= 43200; n++) {
      for (let n = 1; n <= 100; n++) {
        const code = await this.plusCodes.getNthCodeLength4CodeNotNearPoles(n);
        const plusCodeASCII = await this.plusCodes.methods['toString(uint256)'](code);
        this.allCodeLength4CodeNotNearPoles.push(plusCodeASCII);
      }
      for (let n = 43100; n <= 43200; n++) {
        const code = await this.plusCodes.getNthCodeLength4CodeNotNearPoles(n);
        const plusCodeASCII = await this.plusCodes.methods['toString(uint256)'](code);
        this.allCodeLength4CodeNotNearPoles.push(plusCodeASCII);
      }
    });

    it('codes are unique', async function () {
      const uniques = Array.from(new Set(this.allCodeLength4CodeNotNearPoles));
      expect(uniques.length).to.equal(this.allCodeLength4CodeNotNearPoles.length);
    });

    it('codes are alphabetized', async function () {
      for (let i = 1; i < this.allCodeLength4CodeNotNearPoles.length; i++) {
        expect(this.allCodeLength4CodeNotNearPoles[i - 1] < this.allCodeLength4CodeNotNearPoles[i]).to.equal(true);
      }
    });

    it('codes are valid code length 4 Plus Codes', async function () {
      this.allCodeLength4CodeNotNearPoles.forEach(element => {
        expect(isAValidCodeLength4PlusCode(element)).to.equal(true);
      });
    });

    it('codes are not near poles', async function () {
      this.allCodeLength4CodeNotNearPoles.forEach(element => {
        expect(isNearPoles(element)).to.equal(false);
      });
    });

    it('reverts for too-low input', async function () {
      await expectRevert(this.plusCodes.getNthCodeLength4CodeNotNearPoles(0), 'Out of range');
    });

    it('reverts for too-high input', async function () {
      await expectRevert(this.plusCodes.getNthCodeLength4CodeNotNearPoles(43201), 'Out of range');
    });
  });

  describe('getNthCodeLength2CodeNearPoles', async function () {
    function isAValidCodeLength2PlusCode (plusCodeASCII) {
      // See https://github.com/google/open-location-code
      const regexp = /^[2-9C][[2-9CFGHJMPQRV]000000\+$/;
      return regexp.test(plusCodeASCII);
    }

    function isNearPoles (plusCodeASCII) {
      // See https://github.com/google/open-location-code
      const regexp = /^[23C]/;
      return regexp.test(plusCodeASCII);
    }

    before(async function () {
      this.allCodeLength2CodeNearPoles = [];
      for (let n = 1; n <= 54; n++) {
        const code = await this.plusCodes.getNthCodeLength2CodeNearPoles(n);
        const plusCodeASCII = await this.plusCodes.methods['toString(uint256)'](code);
        this.allCodeLength2CodeNearPoles.push(plusCodeASCII);
      }
    });

    it('codes are unique', async function () {
      const uniques = Array.from(new Set(this.allCodeLength2CodeNearPoles));
      expect(uniques.length).to.equal(this.allCodeLength2CodeNearPoles.length);
    });

    it('codes are alphabetized', async function () {
      for (let i = 1; i < this.allCodeLength2CodeNearPoles.length; i++) {
        expect(this.allCodeLength2CodeNearPoles[i - 1] < this.allCodeLength2CodeNearPoles[i]).to.equal(true);
      }
    });

    it('codes are valid code length 2 Plus Codes', async function () {
      this.allCodeLength2CodeNearPoles.forEach(element => {
        expect(isAValidCodeLength2PlusCode(element)).to.equal(true);
      });
    });

    it('codes are near poles', async function () {
      this.allCodeLength2CodeNearPoles.forEach(element => {
        expect(isNearPoles(element)).to.equal(true);
      });
    });

    it('reverts for too-low input', async function () {
      await expectRevert(this.plusCodes.getNthCodeLength2CodeNearPoles(0), 'Out of range');
    });

    it('reverts for too-high input', async function () {
      await expectRevert(this.plusCodes.getNthCodeLength2CodeNearPoles(55), 'Out of range');
    });
  });

  describe('getCodeLength', function () {
    async function checkToCodeLength (plusCodes, plusCodeASCII, length) {
      const plusCode = new BN(Buffer.from(plusCodeASCII).toString('hex'), 16);
      expect(await plusCodes.getCodeLength(plusCode)).to.bignumber.equal(length);
    }

    it('it gets the length of a code length 2 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22000000+', '2');
    });

    it('it gets the length of a code length 4 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22330000+', '4');
    });

    it('it gets the length of a code length 6 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22334400+', '6');
    });

    it('it gets the length of a code length 8 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22334422+', '8');
    });

    it('it gets the length of a code length 10 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22334422+CC', '10');
    });

    it('it gets the length of a code length 11 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22334422+CCR', '11');
    });

    it('it gets the length of a code length 12 Plus Code', async function () {
      await checkToCodeLength(this.plusCodes, '22GHJMPQ+RVWX', '12');
    });

    it('it reverts on a too-long code', async function () {
      const plusCode = new BN(Buffer.from('123456789+').toString('hex'), 16);
      await expectRevert(this.plusCodes.getCodeLength(plusCode), 'Too many characters in Plus Code');
    });

    it('it reverts if past North Pole', async function () {
      const plusCode = new BN(Buffer.from('F2000000+').toString('hex'), 16);
      await expectRevert(this.plusCodes.getCodeLength(plusCode), 'Beyond North Pole');
    });

    it('it reverts if past antimeridian', async function () {
      const plusCode = new BN(Buffer.from('2W000000+').toString('hex'), 16);
      await expectRevert(this.plusCodes.getCodeLength(plusCode), 'Beyond antimeridian');
    });

    it('it reverts if code length 13', async function () {
      const plusCode = new BN(Buffer.from('22GHJMPQ+RVWX2').toString('hex'), 16);
      await expectRevert(this.plusCodes.getCodeLength(plusCode), 'Code lengths greater than 12 are not supported');
    });
  });
});
