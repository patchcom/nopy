const path = require('path');
const { expect } = require('chai');
const { findSourceArg, findPackageDir, pythonEnv, spawnPython } = require('../..');

describe("findSourceArg", function() {
  it("finds lone source arg", function() {
    expect(findSourceArg(["src/test/test.py"])).to.equal("src/test/test.py");
  });

  it("finds source arg followed by arguments", function() {
    expect(findSourceArg(["src/test/test.py", "-a", "file.xml"])).to.equal("src/test/test.py");
  });

  it("finds source arg preceded by python options", function() {
    expect(findSourceArg(["-O", "-d", "src/test/test.py"])).to.equal("src/test/test.py");
  });

  it("finds source arg preceded by python option with argument", function() {
    expect(findSourceArg(["-X", "zippymode", "src/test/test.py"])).to.equal("src/test/test.py");
  });

  it("finds no source arg when running module", function() {
    expect(findSourceArg(["-m", "runme", "src/test/test.py"])).to.be.undefined;
  });

  it("finds no source arg when running command", function() {
    expect(findSourceArg(["-c", "print(1)", "src/test/test.py"])).to.be.undefined;
  });

  it("finds no source arg when running from stdin", function() {
    expect(findSourceArg(["-", "src/test/test.py"])).to.be.undefined;
  });
})

describe("findPackageDir", function() {
  it("passes through explicit package dir", function() {
    return findPackageDir({ packageDir: "package/dir" }).then(dir => {
      expect(dir).to.equal("package/dir");
    });
  })

  it("finds dir for src/test/test.py", function() {
    return findPackageDir({ searchPath: "src/test/test.py" }).then(dir => {
      expect(dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for src/test/", function() {
    return findPackageDir({ searchPath: "src/test/" }).then(dir => {
      expect(dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for src", function() {
    return findPackageDir({ searchPath: "src" }).then(dir => {
      expect(dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for .", function() {
    return findPackageDir({ searchPath: "." }).then(dir => {
      expect(dir).to.equal(path.resolve("."));
    });
  })

  it("does not find dir for /", function() {
    return findPackageDir({ searchPath: "/" }).then(() => {
      throw "Expected exception";
    }).catch(error => {
      expect(error.message).to.equal("Could not find directory containing package.json");
    });
  })
})

describe("pythonEnv", function() {
  it("builds environment with user base directory in package directory", function() {
    expect(pythonEnv("/a/b/c", {})).to.deep.equal({
      "PYTHONUSERBASE": path.join("/a/b/c", "python_modules"),
    });
  })

  it("augments environment with user base directory", function() {
    expect(pythonEnv("/a/b/c", {
      "HOME": "/home/al",
    })).to.deep.equal({
      "PYTHONUSERBASE": path.join("/a/b/c", "python_modules"),
      "HOME": "/home/al",
    });
  })

  it("removes env variable to disable user base directory", function() {
    expect(pythonEnv("/a/b/c", {
      "PYTHONNOUSERSITE": "1",
    })).to.deep.equal({
      "PYTHONUSERBASE": path.join("/a/b/c", "python_modules"),
    });
  })
})

describe("spawnPython", function() {
  it("spawns src/test/test.py and retrieves status code", function() {
    return spawnPython(["src/test/test.py", "7"], { throwNonZeroStatus: false }).then(code => {
      expect(code).to.equal(7);
    });
  })

  it("spawns src/test/test.py and throws on non-zero status code", function() {
    return spawnPython(["src/test/test.py", "7"]).then(() => {
      throw "Fails";
    }).catch(error => {
      expect(error).to.match(/Exited with code 7/);
    });
  })

  it("spawns src/test/test.py and retrieves stdout when exit status code is zero", function() {
    return spawnPython(["src/test/test.py", "0", "a", "b"], { interop: "buffer" }).then(({ code, stdout, stderr }) => {
      expect(code).to.equal(0);
      expect(stderr).to.match(/^hello from stderr$/m);

      let parsed = JSON.parse(stdout);
      expect(parsed.args).to.deep.equal(["a", "b"]);
    });
  })

  it("spawns src/test/test.py and throws stderr when exit status code is non-zero", function() {
    return spawnPython(["src/test/test.py", "7", "a", "b"], { interop: "buffer" }).then(() => {
      throw "Fails";
    }).catch(error => {
      expect(error).to.match(/Exited with code 7/);
      expect(error).to.match(/hello from stderr/);
    });
  })

  it("error on unexpected interop mode", function() {
    return spawnPython(["src/test/test.py", "0", "a", "b"], { interop: "bad" }).then(() => {
      throw "Fails";
    }).catch(error => {
      expect(error).to.match(/bad/);
    });
  })
})
