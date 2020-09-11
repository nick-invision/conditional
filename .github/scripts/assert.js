const expected = process.argv[2];
const actual = process.argv[3];

if (expected === actual) {
  console.log(`Expected strings are a match`);
  process.exit(0);
}

console.log(`Expected string '${expected} does not match received '${actual}'`);
process.exit(1);
