import dbClient from "../../utils/db";
import redisClient from "../../utils/redis"; // Ensure you import redisClient if it's used in the tests

/**
 * tests for AuthController
 * mockuser
 * raka@demo.com
 */
describe("AuthController", () => {
  const mockUser = {
    email: "ava@linda.com",
    password: "avalinda",
  };
  let token = "";

  before(function (done) {
    this.timeout(10000);
    dbClient
      .usersCollection()
      .then((usersCollection) => {
        usersCollection
          .deleteMany({ email: mockUser.email })
          .then(() => {
            request
              .post("/users")
              .send({
                email: mockUser.email,
                password: mockUser.password,
              })
              .expect(201)
              .end((requestErr, res) => {
                if (requestErr) {
                  return done(requestErr);
                }
                expect(res.body.email).to.eql(mockUser.email);
                expect(res.body.id.length).to.be.greaterThan(0);
                done();
              });
          })
          .catch((deleteErr) => done(deleteErr));
      })
      .catch((connectErr) => done(connectErr));
  });
  /**
   * connect
   */
  describe("GET /connect", () => {
    it('should fail with no "Authorization" header field', function (done) {
      this.timeout(5000);
      request
        .get("/connect")
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: "Unauthorized" });
          done();
        });
    });

    it("should fail for a non-existent user", function (done) {
      this.timeout(5000);
      request
        .get("/connect")
        .auth("raka@demo", "rakadm", { type: "basic" })
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: "Unauthorized" });
          done();
        });
    });

    it("should fail with a valid email and wrong password", function (done) {
      this.timeout(5000);
      request
        .get("/connect")
        .auth(mockUser.email, "rakadem", { type: "basic" })
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: "Unauthorized" });
          done();
        });
    });

    it("should fail with an invalid email and valid password", function (done) {
      this.timeout(5000);
      request
        .get("/connect")
        .auth("raka@demo.com", mockUser.password, { type: "basic" })
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: "Unauthorized" });
          done();
        });
    });
    /**
     * existing user
     */
    it("should succeed for an existing user", function (done) {
      this.timeout(5000);
      request
        .get("/connect")
        .auth(mockUser.email, mockUser.password, { type: "basic" })
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body.token).to.exist;
          expect(res.body.token.length).to.be.greaterThan(0);
          token = res.body.token;
          done();
        });
    });
  });
  /**
   * disconnect
   */
  describe("GET /disconnect", () => {
    it('should fail with no "X-Token" header field', function (done) {
      this.timeout(5000);
      request
        .get("/disconnect")
        .expect(401)
        .end((requestErr, res) => {
          if (requestErr) {
            return done(requestErr);
          }
          expect(res.body).to.deep.eql({ error: "Unauthorized" });
          done();
        });
    });
    /**
     * non-existent user
     */
    it("should fail for a non-existent user", function (done) {
      this.timeout(5000);
      request
        .get("/disconnect")
        .set("X-Token", "raboof")
        .expect(401)
        .end((requestErr, res) => {
          if (requestErr) {
            return done(requestErr);
          }
          expect(res.body).to.deep.eql({ error: "Unauthorized" });
          done();
        });
    });

    // should fail for a non-existent user
    it('should succeed with a valid "X-Token" field', function (done) {
      request
        .get("/disconnect")
        .set("X-Token", token)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({});
          expect(res.text).to.eql("");
          expect(res.headers["content-type"]).to.not.exist;
          expect(res.headers["content-length"]).to.not.exist;
          done();
        });
    });
  });
});

describe("Redis Operations", () => {
  it("should handle expired key correctly", async function () {
    await redisClient.set("test_key", "value", 1);
    setTimeout(async () => {
      expect(await redisClient.get("test_key")).to.be.null;
    }, 2000);
  });

  // redis client.set('test_key', 'value', 10)
  it("should handle deleted key correctly", async function () {
    await redisClient.set("test_key", "value", 10);
    await redisClient.del("test_key");
    setTimeout(async () => {
      expect(await redisClient.get("test_key")).to.be.null;
    }, 2000);
  });
});
