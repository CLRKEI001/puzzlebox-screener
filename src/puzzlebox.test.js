import {
  isDuplicateStudent,
  validateLogin,
  calcScore,
  anonymiseId,
} from "./utils/studentUtils";

describe("PuzzleBox test cases", () => {
  test("TC1: invalid login is rejected with an error message", () => {
    const result = validateLogin("wrong-email", "123");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("TC2: valid login is accepted", () => {
    const result = validateLogin("teacher@school.com", "correctpassword");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  test("TC3: a new student is not flagged as a duplicate", () => {
    const existing = [{ firstName: "Stacey", lastName: "Jacobs", dob: "2020-03-14" }];
    const newStudent = { firstName: "Thando", lastName: "Mbeki", dob: "2020-05-02" };
    expect(isDuplicateStudent(existing, newStudent)).toBe(false);
  });

  test("TC4: the same student (different letter case) is flagged as a duplicate", () => {
    const existing = [{ firstName: "Stacey", lastName: "Jacobs", dob: "2020-03-14" }];
    const dup = { firstName: "stacey", lastName: "JACOBS", dob: "2020-03-14" };
    expect(isDuplicateStudent(existing, dup)).toBe(true);
  });

  test("TC5: section scores add up (0/1, 1/1, 0/1, 0/1 = 1 out of 4)", () => {
    expect(calcScore([0, 1, 0, 0])).toEqual({ score: 1, total: 4 });
  });

  test("TC6: reports use a coded ID, not the child's name", () => {
    const code = anonymiseId({ id: "x91kq2", firstName: "Stacey" });
    expect(code).not.toMatch(/stacey/i);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});