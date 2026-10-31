import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createRuntimeMarker, readRuntimeFailure, readCompilationFailure, wrapPython, wrapCpp, wrapJava } from '../utils/judgingRuntime.js';

const run = (command, args, input) => spawnSync(command, args, { input, encoding: 'utf8', timeout: 20000, windowsHide: true });
const available = command => !run(command, ['--version']).error;

function tempDirectory(t) {
    const prefix = join(tmpdir(), 'codinglab-runtime-');
    const directory = mkdtempSync(prefix);
    t.after(() => {
        const target = resolve(directory);
        assert.ok(target.startsWith(resolve(tmpdir()) + sep));
        assert.ok(target.startsWith(prefix));
        rmSync(target, { recursive: true, force: true });
    });
    return directory;
}

test('ordinary error-looking output is not a runtime signal', () => {
    const marker = createRuntimeMarker();
    for (const output of ['Traceback: example text', 'Segmentation fault', 'Runtime Error', 'CODINGLAB_RUNTIME_other:ZeroDivisionError']) {
        assert.equal(readRuntimeFailure({ output, exitCode: 0 }, marker), '');
    }
    assert.match(readRuntimeFailure({ exitCode: '2' }, marker), /code 2/);
    assert.equal(readRuntimeFailure({ exitCode: null }, marker), '');
});

for (const [name, code, error] of [
    ['division by zero', 'print(1 / 0)', /ZeroDivisionError at line 1/],
    ['index error', 'print([][1])', /IndexError at line 1/],
    ['nonzero exit', 'raise SystemExit(2)', /Non-zero SystemExit/],
    ['normal zero exit', 'print(2)\nraise SystemExit(0)', null],
    ['ordinary stderr', 'import sys\nprint("debug", file=sys.stderr)\nprint(2)', null],
]) {
    test(`Python wrapper reports ${name} correctly`, { skip: !available('python') }, () => {
        const marker = createRuntimeMarker();
        const result = run('python', ['-c', wrapPython(code, marker)], '1');
        assert.ifError(result.error);
        const failure = readRuntimeFailure({ output: result.stdout, stderr: result.stderr }, marker);
        if (error) { assert.match(failure, error); assert.notEqual(result.status, 0); }
        else { assert.equal(failure, ''); assert.equal(result.status, 0); assert.match(result.stdout, /2/); }
    });
}

test('Python reports a later failing test even after an earlier successful output', { skip: !available('python') }, () => {
    const marker = createRuntimeMarker();
    const result = run('python', ['-c', wrapPython('x = int(input())\nprint(2 // x)', marker)], '1\n///\n0');
    assert.match(result.stdout, /2/);
    assert.match(readRuntimeFailure({ output: result.stdout + result.stderr }, marker), /ZeroDivisionError/);
});

test('Python syntax failure is reported separately from a runtime error', { skip: !available('python') }, () => {
    const marker = createRuntimeMarker();
    const result = run('python', ['-c', wrapPython('if :', marker)], '1');
    const data = { output: result.stdout, stderr: result.stderr, exitCode: result.status };
    assert.equal(readRuntimeFailure(data, marker), '');
    assert.match(readCompilationFailure(data, marker), /SyntaxError at line 1/);
});

test('Python runtime diagnostics omit exception messages containing hidden input', { skip: !available('python') }, () => {
    const marker = createRuntimeMarker();
    const result = run('python', ['-c', wrapPython('raise ValueError(input())', marker)], 'hidden-test-secret');
    const failure = readRuntimeFailure({ output: result.stdout, stderr: result.stderr }, marker);
    assert.match(failure, /ValueError/);
    assert.ok(!failure.includes('hidden-test-secret'));
});

for (const [name, code, error] of [
    ['normal output', '#include <iostream>\nint main(){ std::cout << 2; return 0; }', null],
    ['exception', '#include <stdexcept>\nint main(){ throw std::runtime_error("hidden-secret"); return 0; }', /Unhandled C\+\+ exception/],
    ['fatal signal', '#include <csignal>\nint main(){ raise(SIGSEGV); return 0; }', /Fatal runtime signal/],
]) {
    test(`C++ wrapper handles ${name}`, { skip: !available('g++') }, t => {
        const directory = tempDirectory(t);
        const marker = createRuntimeMarker();
        const source = join(directory, 'main.cpp');
        const executable = join(directory, process.platform === 'win32' ? 'main.exe' : 'main');
        writeFileSync(source, wrapCpp(code, marker));
        const compiled = run('g++', ['-std=c++17', source, '-o', executable]);
        assert.equal(compiled.status, 0, compiled.stderr);
        const result = run(executable, [], '1');
        assert.ifError(result.error);
        const failure = readRuntimeFailure({ output: result.stdout, stderr: result.stderr }, marker);
        if (error) assert.match(failure, error);
        else { assert.equal(failure, ''); assert.equal(result.status, 0); assert.equal(result.stdout, '2'); }
    });
}

for (const [name, statement, error] of [
    ['normal output', 'System.out.print(2);', null],
    ['runtime exception', 'int zero = 0; System.out.print(2 / zero);', /ArithmeticException/],
]) {
    test(`Java wrapper handles ${name}`, { skip: !available('javac') || !available('java') }, t => {
        const directory = tempDirectory(t);
        const marker = createRuntimeMarker();
        const source = join(directory, 'JDoodleWrapper.java');
        writeFileSync(source, wrapJava(`public class Main { public static void main(String[] args) { ${statement} } }`, marker));
        const compiled = run('javac', [source]);
        assert.equal(compiled.status, 0, compiled.stderr);
        const result = run('java', ['-cp', directory, 'JDoodleWrapper'], '1');
        const failure = readRuntimeFailure({ output: result.stdout, stderr: result.stderr }, marker);
        if (error) assert.match(failure, error);
        else { assert.equal(failure, ''); assert.equal(result.status, 0); assert.equal(result.stdout, '2'); }
    });
}
