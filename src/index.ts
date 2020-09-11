import { setOutput, info, warning, error } from "@actions/core";

const INPUT_PREFIX = "INPUT_";
const IF = "if";
const IF_THEN = "ifThen";
const ELSE_IF = "elseIf";
const ELSE_IF_THEN = "elseIfThen";
const ELSE = "else";
const THEN = "then";

// const inputs = {
//   if: "false",
//   elseIf: "false",
//   elseIf2: "true",
//   elseIf3: "false",
//   else: "neither",
// };

// process.env = {
//   ...process.env,
//   INPUT_if: inputs.if,
//   INPUT_ifThen_a: "then a",
//   INPUT_ifThen_b: "then b",
//   INPUT_ifThen_c: "then c",
//   INPUT_elseIf: inputs.elseIf,
//   INPUT_elseIfThen_a: "elseIfThen a",
//   INPUT_elseIfThen_b: "elseIfThen b",
//   INPUT_elseIfThen_c: "elseIfThen c",
//   INPUT_elseIfA: inputs.elseIf2,
//   INPUT_elseIfThenA_a: "elseIfThenA a",
//   INPUT_elseIfThenA_b: "elseIfThenA b",
//   INPUT_elseIfThenA_c: "elseIfThenA c",
//   INPUT_elseIfB: inputs.elseIf3,
//   INPUT_elseIfThenB_a: "elseIfThenB a",
//   INPUT_elseIfThenB_b: "elseIfThenB b",
//   INPUT_elseIfThenB_c: "elseIfThenB c",
//   INPUT_else_a: "else a",
//   INPUT_else_b: "else b",
//   INPUT_else_c: "else c"
// };

interface Conditionals {
  if: Conditional;
  elseIfs: Conditional[];
  else: Parameter[];
}

interface Conditional {
  conditional: boolean;
  thens: Parameter[];
  sourceInput?: string;
}

interface Parameter {
  id: string;
  value: string;
}

const getCondition = (i: string): string => i.split("_")[1];
const getOutputId = (i: string): string => i.split("_").slice(2).join("_");
const isThen = (i: string): boolean => getCondition(i)?.endsWith(THEN) ?? false;
const isTrue = (value: string): boolean => value.toLowerCase() === "true";

function parseInputs(): Conditionals {
  const inputs: Parameter[] = Object.keys(process.env)
    .filter((key) => key.startsWith(INPUT_PREFIX))
    .map((key) => {
      return {
        id: key,
        value: `${process.env[key]}`,
      };
    });

  return {
    if: getIf(inputs),
    elseIfs: getElseIfs(inputs),
    else: getElse(inputs),
  };
}

function getOutputs(conditional: string, inputs: Parameter[]): Parameter[] {
  const outputs: Parameter[] = [];
  for (const input of inputs) {
    if (getCondition(input.id) === conditional) {
      outputs.push({
        id: getOutputId(input.id),
        value: input.value,
      });
    }
  }
  return outputs;
}

function getIf(inputs: Parameter[]): Conditional {
  const condition = inputs.filter((i) => getCondition(i.id) === IF);

  if (condition.length !== 1) {
    console.log(JSON.stringify(inputs, null, 2));
    throw new Error(`Only one ${IF} expected. Found ${condition.length}.`);
  }

  return {
    conditional: isTrue(condition[0].value),
    thens: getOutputs(IF_THEN, inputs),
  };
}

function getElseIfs(inputs: Parameter[]): Conditional[] {
  const conditionals: Conditional[] = [];
  const elseIfs = inputs
    .filter(
      (i) =>
        getCondition(i.id).startsWith(ELSE_IF) &&
        !getCondition(i.id).startsWith(ELSE_IF_THEN)
    )
    // sort by "elseIf" name in case multiple elseIfs are specified, this requires
    // the elseIfs to be in alphabetical order in the action configuration
    .sort((a, b) => (a.id > b.id ? 1 : -1));

  for (const elseIf of elseIfs) {
    // if multiple elseIf's exist, then an id can be appended which is used to
    // correllate the elseIfThen's to the proper elseIf
    // e.g., elseIfA maps to elseIfThenA_someOutput
    const elseIfId = elseIf.id.split(ELSE_IF)[1];
    conditionals.push({
      conditional: isTrue(elseIf.value),
      thens: getOutputs(`${ELSE_IF_THEN}${elseIfId}`, inputs),
      sourceInput: elseIf.id,
    });
  }

  return conditionals;
}

function getElse(inputs: Parameter[]): Parameter[] {
  return getOutputs(ELSE, inputs);
}

function setOutputs(thens: Parameter[]): void {
  for (const param of thens) {
    setOutput(param.id, param.value);
  }
}

function logResult(condition: string, outputs: Parameter[]): void {
  const outs = outputs.map((o) => o.id).join(", ");
  const cond = condition.replace(INPUT_PREFIX, "");

  if (condition === ELSE) {
    info(`Else block hit.  Set outputs(s) [${outs}]`);
  } else {
    info(`${cond} evaluated to true.  Set output(s) [${outs}]`);
  }
}

async function run() {
  const conditions = parseInputs();

  if (conditions.if.conditional) {
    setOutputs(conditions.if.thens);
    logResult(IF, conditions.if.thens);
    return;
  }

  for (const elseIf of conditions.elseIfs) {
    if (elseIf.conditional) {
      setOutputs(elseIf.thens);
      logResult(elseIf.sourceInput ?? ELSE_IF, elseIf.thens);
      return;
    }
  }

  if (conditions.else.length > 0) {
    setOutputs(conditions.else);
    logResult(ELSE, conditions.else);
    return;
  }

  warning(`Nothing evaluated to true so no outputs were set`);
}

run().catch((e) => {
  error(`An error occurred: ${e}`);
  process.exit(1);
});
