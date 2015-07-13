/*jslint node: true*/
var assert = require('chai').assert;
var fs = require('fs');
var $rdf = require('rdflib');
var request = require('request');
var S = require('string');
var supertest = require('supertest');
var ldnode = require('../index');

describe('ACL', function() {
    this.timeout(10000);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    var ns = require('../vocab/ns.js').ns;
    var address = 'https://localhost:3456/test/';

    var ldp = ldnode.createServer({
        mount: '/test',
        base: __dirname,
        key: __dirname + '/key.pem',
        cert: __dirname + '/cert.pem',
        webid: true
    });
    ldp.listen(3456);

    var aclExtension = '.acl';
    var metaExtension = '.meta';
    var server = supertest(address);

    var testDir = 'acl/testDir';
    var testDirAclFile = testDir + '/' + aclExtension;

    var abcFile = testDir + '/abc.ttl';
    var abcAclFile = abcFile + aclExtension;
    var abcdFile = testDir + '/abcd.ttl';
    var abcdAclFile = abcFile + aclExtension;

    var globFile = testDir + "/*";

    var groupFile = testDir + "/group";

    var origin1 = "http://example.org/";
    var origin2 = "http://example.com/";

    var user1 = "https://user1.databox.me/profile/card#me";
    var user2 = "https://user2.databox.me/profile/card#me";
    var userCredentials = {
        user1: {
            cert: fs.readFileSync(__dirname + '/testfiles/user1-cert.pem'),
            key: fs.readFileSync(__dirname + '/testfiles/user1-key.pem')
        },
        user2: {
            cert: fs.readFileSync(__dirname + '/testfiles/user2-cert.pem'),
            key: fs.readFileSync(__dirname + '/testfiles/user2-key.pem')
        }
    };

    function createOptions(path, user) {
        var options = {
            url: address + path
        };
        if (user) {
            options.agentOptions = userCredentials[user];
        }
        return options;
    }


    describe('Basic HTTPS Test', function() {
        it('Should return "Hello, World!"', function(done) {
            var options = createOptions('hello.html', 'user1');
            request(options, function(error, response, body) {
                assert.equal(response.statusCode, 200);
                assert.match(response.headers['content-type'], /text\/html/);
                done();
            });
        });
        it("Should return User header", function(done) {
            var options = createOptions('hello.html', 'user1');
            request(options, function(error, response, body) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.headers.user, user1);
                done();
            });
        });
    });

    describe("Empty ACL Test", function() {
        it("Should create test folder", function(done) {
            var options = createOptions(testDir + '/' + metaExtension, 'user1');
            options.body = "";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("Should create empty acl file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = '';
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("Should create test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = '<a> <b> <c> .';
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("Should create test file's acl file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = '';
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("Should access test file's acl file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            options.headers = {
                accept: 'text/turtle'
            };
            request.get(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                assert.match(response.headers['content-type'], /text\/turtle/);
                done();
            });
        });
    });

    describe("ACL Origin Test", function() {
        it("Should PUT new ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<#Owner>\n" +
                " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" + ">, <" + address + testDirAclFile + ">;\n" +
                " <http://www.w3.org/ns/auth/acl#agent> <" + user1 + ">;\n" +
                " <http://www.w3.org/ns/auth/acl#origin> <" + origin1 + ">;\n" +
                " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .\n" +
                "<#Public>\n" +
                " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" + ">;\n" +
                " <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>;\n" +
                " <http://www.w3.org/ns/auth/acl#origin> <" + origin1 + ">;\n" +
                " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
                //TODO triple header
                //TODO user header
            });
        });
        it("user1 should be able to access test directory", function(done) {
            var options = createOptions(testDir, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to access to test directory when origin is valid",
            function(done) {
                var options = createOptions(testDir, 'user1');
                options.headers = {
                    origin: origin1
                };
                request.head(options, function(error, response, body) {
                    assert.equal(error, null);
                    assert.equal(response.statusCode, 200);
                    done();
                });
            });
        it("user1 should be denied access to test directory when origin is invalid",
            function(done) {
                var options = createOptions(testDir, 'user1');
                options.headers = {
                    origin: origin2
                };
                request.head(options, function(error, response, body) {
                    assert.equal(error, null);
                    assert.equal(response.statusCode, 403);
                    done();
                });
            });
        it("agent should be able to access test directory", function(done) {
            var options = createOptions(testDir);
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("agent should be able to access to test directory when origin is valid",
            function(done) {
                var options = createOptions(testDir, 'user1');
                options.headers = {
                    origin: origin1
                };
                request.head(options, function(error, response, body) {
                    assert.equal(error, null);
                    assert.equal(response.statusCode, 200);
                    done();
                });
            });
        it("agent should be denied access to test directory when origin is invalid",
            function(done) {
                var options = createOptions(testDir);
                options.headers = {
                    origin: origin2
                };
                request.head(options, function(error, response, body) {
                    assert.equal(error, null);
                    assert.equal(response.statusCode, 401);
                    done();
                });
            });
    });

    describe("ACL owner only test", function() {
        var body = "<#Owner>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" +
            ">, <" + address + testDirAclFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#owner> <" + user1 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .\n";
        it("user1 should be able to access test directory", function(done) {
            var options = createOptions(testDir, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user2 should be able to access test directory", function(done) {
            var options = createOptions(testDir, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("Should create new ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to access ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to access test directory", function(done) {
            var options = createOptions(testDir, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to modify ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user2 should not be able to access test direcotory", function(done) {
            var options = createOptions(testDir, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should not be able to access ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should not be able to modify ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user2');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("agent request should require authorization", function(done) {
            var options = createOptions(testDirAclFile);
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 401);
                done();
            });
        });
    });

    describe("ACL read-only test", function() {
        var body = "<#Owner>\n" +
            " a <http://www.w3.org/ns/auth/acl#Authorization> ;\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" +
            ">, <" + address + testDirAclFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agent> <" + user1 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .\n" +
            "<#Public>\n" +
            " a <http://www.w3.org/ns/auth/acl#Authorization> ;\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .\n";

        it("user1 should be able to create new ACL file",
            function(done) {
                var options = createOptions(testDirAclFile, 'user1');
                options.headers = {
                    'content-type': 'text/turtle'
                };
                options.body = body;
                request.put(options, function(error, response, body) {
                    assert.equal(error, null);
                    assert.equal(response.statusCode, 201);
                    done();
                });
            });
        it("user1 should be able to access ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to access test directory", function(done) {
            var options = createOptions(testDir, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to modify ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user2 should be able to access test direcotory", function(done) {
            var options = createOptions(testDir, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user2 should not be able to access ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should not be able to modify ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user2');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("agent should be able to access test direcotory", function(done) {
            var options = createOptions(testDir);
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("agent should not be able to modify ACL file", function(done) {
            var options = createOptions(testDirAclFile);
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 401);
                done();
            });
        });
    });

    describe("ACL glob test", function() {
        it("user2 should be able to send glob request", function(done) {
            var options = createOptions(globFile, 'user2');
            request.get(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                var globGraph = $rdf.graph();
                $rdf.parse(body, globGraph, address + testDir + '/', 'text/turtle');
                var authz = globGraph.the(undefined, undefined, ns.acl("Authorization"));
                assert.equal(authz, null);
                done();
            });
        });
        it("user1 should be able to send glob request", function(done) {
            var options = createOptions(globFile, 'user1');
            request.get(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                var globGraph = $rdf.graph();
                $rdf.parse(body, globGraph, address + testDir + '/', 'text/turtle');
                var authz = globGraph.the(undefined, undefined, ns.acl("Authorization"));
                assert.equal(authz, null);
                done();
            });
        });
        it("user1 should be able to delete ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            request.del(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
    });

    describe("ACL append-only test", function() {
        var body = "<#Owner>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + abcFile +
            ">, <" + address + abcAclFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agent> <" + user1 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .\n" +
            "<#AppendOnly>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + abcFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Append> .\n";
        it("user1 should be able to write test file's acl file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to access test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to access test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        //TODO POST instead of PUT
        it("user1 should be able to modify test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<a> <b> <c> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user2 should not be able to access test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should not be able to access test file", function(done) {
            var options = createOptions(abcFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should be able to modify test file", function(done) {
            var options = createOptions(abcFile, 'user2');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("agent should not be able to access test file", function(done) {
            var options = createOptions(abcFile);
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 401);
                done();
            });
        });
        it("agent should be able to modify test file", function(done) {
            var options = createOptions(abcFile);
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<g> <h> <i> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to delete test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            request.del(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
    });

    describe("ACL restricted test", function() {
        var body = "<#Owner>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + abcFile + ">, <" +
            address + abcAclFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agent> <" + user1 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .\n" +
            "<#Restricted>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + abcFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agent> <" + user2 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write>.\n";
        it("user1 should be able to modify test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to access test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to access test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to modify test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<a> <b> <c> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user2 should be able to access test file", function(done) {
            var options = createOptions(abcFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user2 should not be able to access test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should be able to modify test file", function(done) {
            var options = createOptions(abcFile, 'user2');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("agent should not be able to access test file", function(done) {
            var options = createOptions(abcFile);
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 401);
                done();
            });
        });
        it("agent should not be able to modify test file", function(done) {
            var options = createOptions(abcFile);
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 401);
                done();
            });
        });
        it("user1 should be able to delete test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            request.del(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
    });

    describe("ACL group test", function() {
        var groupTriples = "<#> a <http://xmlns.com/foaf/0.1/Group>;\n" +
            " <http://xmlns.com/foaf/0.1/member> <a>, <b>, <" + user2 + ">.";
        var body = "<#Owner>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + abcFile + ">, <" +
            address + abcAclFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agent> <" + user1 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#defaultForNew> <" + address + testDir + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .\n" +
            "<#Group>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + abcFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agentClass> <" + address + groupFile + "#>;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .\n";
        it("user1 should be able to add group triples", function(done) {
            var options = createOptions(groupFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = groupTriples;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to modify test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });

        it("user1 should be able to access test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to modify test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<a> <b> <c> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to access test file", function(done) {
            var options = createOptions(abcFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        // it("user2 should not be able to access test file's ACL file", function(done) {
        //     var options = createOptions(abcAclFile, 'user2');
        //     request.head(options, function(error, response, body) {
        //         assert.equal(error, null);
        //         assert.equal(response.statusCode, 403);
        //         done();
        //     });
        // });
        // it("user2 should be able to access test file", function(done) {
        //     var options = createOptions(abcFile, 'user2');
        //     request.head(options, function(error, response, body) {
        //         assert.equal(error, null);
        //         assert.equal(response.statusCode, 200);
        //         done();
        //     });
        // });
        // it("user2 should not be able to modify test file", function(done) {
        //     var options = createOptions(abcFile, 'user2');
        //     options.headers = {
        //         'content-type': 'text/turtle'
        //     };
        //     options.body = "<d> <e> <f> .\n";
        //     request.put(options, function(error, response, body) {
        //         assert.equal(error, null);
        //         assert.equal(response.statusCode, 403);
        //         done();
        //     });
        // });
        // it("agent should not be able to access test file", function(done) {
        //     var options = createOptions(abcFile);
        //     request.head(options, function(error, response, body) {
        //         assert.equal(error, null);
        //         assert.equal(response.statusCode, 401);
        //         done();
        //     });
        // });
        // it("agent should not be able to modify test file", function(done) {
        //     var options = createOptions(abcFile);
        //     options.headers = {
        //         'content-type': 'text/turtle'
        //     };
        //     options.body = "<d> <e> <f> .\n";
        //     request.put(options, function(error, response, body) {
        //         assert.equal(error, null);
        //         assert.equal(response.statusCode, 401);
        //         done();
        //     });
        // });
        it("user1 should be able to delete group file", function(done) {
            var options = createOptions(groupFile, 'user1');
            request.del(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to delete test file's ACL file", function(done) {
            var options = createOptions(abcAclFile, 'user1');
            request.del(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
    });

    describe("ACL defaultForNew test", function() {
        var body = "<#Owner>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" + ">, <" +
            address + testDirAclFile + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agent> <" + user1 + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#defaultForNew> <" + address + testDir + "/" + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .\n" +
            "<#Default>\n" +
            " <http://www.w3.org/ns/auth/acl#accessTo> <" + address + testDir + "/" + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#defaultForNew> <" + address + testDir + "/" + ">;\n" +
            " <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>;\n" +
            " <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .\n";
        it("user1 should be able to modify test direcotory's ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = body;
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to access test direcotory's ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user1 should be able to create new test file", function(done) {
            var options = createOptions(abcdFile, 'user1');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<a> <b> <c> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("user1 should be able to access new test file", function(done) {
            var options = createOptions(abcdFile, 'user1');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user2 should not be able to access test direcotory's ACL file", function(done) {
            var options = createOptions(testDirAclFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("user2 should be able to access new test file", function(done) {
            var options = createOptions(abcdFile, 'user2');
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("user2 should not be able to modify new test file", function(done) {
            var options = createOptions(abcdFile, 'user2');
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 403);
                done();
            });
        });
        it("agent should be able to access new test file", function(done) {
            var options = createOptions(abcdFile);
            request.head(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("agent should not be able to modify new test file", function(done) {
            var options = createOptions(abcdFile);
            options.headers = {
                'content-type': 'text/turtle'
            };
            options.body = "<d> <e> <f> .\n";
            request.put(options, function(error, response, body) {
                assert.equal(error, null);
                assert.equal(response.statusCode, 401);
                done();
            });
        });
    });
});