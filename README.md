# Conditional

Conditionally set multiple outputs based on if, else-if, and else expressions. Can evaluate as many else-if statements as desired.

---

## **Inputs**

### **`if`**

**Required** Expression to evaluate first. There can only be one.

### **`ifThen_[output-id]`**

**required** If `if` expression evaluates to true, the [output-id] specified will be set with the configured value. Multiple `ifThen_[output-id]`'s can be configured. See example

### **`elseIf[optional-id]`**

**Optional** Optional expression(s) to evaluate if `if` evaluates to false. If only one elseIf desired, use `elseIf`. If multiples desired then use the format `elseIf[identifier]` with the corresponding `elseIfThen` being in the format of `elseIfThen[identifier]`. If multiple `elseIf` expressions exist, they will be executed in alphabetical order of the `identifier`. See example

### **`elseIfThen[optional-id]_[output-id]`**

**Optional** If corresponding `elseIf[optional-id]` expression evalues to true, the [output-id] specified will be set with the configured value.

### **`else_[output-id]`**

**Optional** If all previous expressions are false, the specifed [output-id] will be set with the configured value.

---

## **Examples**

### Example usage

Basic example with 3 outputs and a single if, elseIf, else configuration.

```yaml
- uses: nick-invision/conditional
  id: conditionals
  with:
    if: github.event_name == 'pull_request'
    ifThen_outA: This is a pull request; conditional output A
    ifThen_outB: This is a pull request; conditional output B
    ifThen_outC: This is a pull request; conditional output C
    elseIf: github.event_name == 'push'
    elseIfThen_outA: This is a push; conditional output A
    elseIfThen_outB: This is a push; conditional output B
    elseIfThen_outC: This is a push; conditional output C
    else_outA: This is neither a push or pull request; conditional output A
    else_outB: This is neither a push or pull request; conditional output B
    else_outC: This is neither a push or pull request; conditional output C
- run: echo "${{ steps.conditionals.outputs.outB }} is dynamic"
```

An example with multiple elseIf statements

```yaml
- uses: nick-invision/conditional
  id: conditionals
  with:
    if: github.event_name == 'pull_request'
    ifThen_outA: This is a pull request; conditional output A
    ifThen_outB: This is a pull request; conditional output B
    ifThen_outC: This is a pull request; conditional output C
    elseIf1: github.event_name == 'push'
    elseIfThen1_outA: This is a push; conditional output A
    elseIfThen1_outB: This is a push; conditional output B
    elseIfThen1_outC: This is a push; conditional output C
    elseIf2: github.event_name == 'label'
    elseIfThen2_outA: This is a label; conditional output A
    elseIfThen2_outB: This is a label; conditional output B
    elseIfThen2_outC: This is a label; conditional output C
    elseIf3: github.event_name == 'issue'
    elseIfThen3_outA: This is a issue; conditional output A
    elseIfThen3_outB: This is a issue; conditional output B
    elseIfThen3_outC: This is a issue; conditional output C
    else_outA: This is not a push, pull request, label or issue; conditional output A
    else_outB: This is not a push, pull request, label or issue; conditional output B
    else_outC: This is not a push, pull request, label or issue; conditional output C
- run: echo "${{ steps.conditionals.outputs.outB }} is dynamic"
```
