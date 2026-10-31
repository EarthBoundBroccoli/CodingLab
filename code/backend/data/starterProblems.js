// Original wording and tests, adapted from the credited problem ideas.
// Each input is one independent run; there is no leading test-case count.
const pack = (definition, cases) => ({
    ...definition, timeLimit: 2000, memoryLimit: 256,
    hiddenInput: cases.map(([input]) => input).join('\n///\n'),
    hiddenOutput: cases.map(([, output]) => output).join('\n///\n'),
});

export const starterProblems = [
    pack({
        title: 'Odd Even Multiplier (Product)', difficulty: 'Easy', tags: ['Math', 'Implementation'],
        statement: 'Given two positive integers, decide whether multiplying them produces an odd or an even number.\n\n## Constraints\n- 1 <= a, b <= 10000\n\n## Submission format\nWrite a complete program that reads one pair from standard input. There is no test-case count. Print only the requested answer.',
        inputFormat: 'One line contains two integers a and b, separated by a space.',
        outputFormat: 'Print Odd if a * b is odd; otherwise print Even. Capitalization matters.',
        samples: [
            { input: '7 8', output: 'Even', explanation: '7 * 8 = 56, which is divisible by 2.' },
            { input: '5 9', output: 'Odd', explanation: '5 * 9 = 45, which is not divisible by 2.' },
        ],
    }, [['1 1','Odd'],['2 3','Even'],['3 2','Even'],['2 2','Even'],['9999 9999','Odd'],['10000 9999','Even'],['1 10000','Even'],['9999 1','Odd'],['10000 10000','Even']]),
    pack({
        title: 'Two Sum (Unique Pair)', difficulty: 'Easy', tags: ['Arrays', 'Hash Map'],
        statement: 'Find two different positions in an integer array whose values add up to the target. Every input has exactly one valid pair of positions. You cannot use the same position twice.\n\n## Constraints\n- 2 <= n <= 10000\n- -1000000000 <= target, a[i] <= 1000000000\n- Exactly one pair exists\n\n## Submission format\nWrite a complete program using standard input and output, not a LeetCode Solution class. Indices start at 0. Print the smaller index first. There is no test-case count.',
        inputFormat: 'First line: n and target. Second line: n space-separated array values.',
        outputFormat: 'Print the two zero-based indices i and j on one line, separated by a single space, with i < j.',
        samples: [
            { input: '4 13\n4 9 1 6', output: '0 1', explanation: 'The values at indices 0 and 1 are 4 and 9; their sum is 13.' },
            { input: '3 12\n6 2 6', output: '0 2', explanation: 'The two occurrences of 6 are at different positions.' },
        ],
    }, [['2 10\n5 5','0 1'],['4 4\n-3 7 2 9','0 1'],['4 5\n0 8 5 12','0 2'],['4 -10\n-7 -3 2 8','0 1'],['5 15\n1 4 8 7 20','2 3'],['2 0\n-1000000000 1000000000','0 1'],['4 6\n3 1 5 10','1 2'],['4 8\n6 1 9 2','0 3'],[`10000 -7\n${Array.from({length:9998},(_,i)=>i+1).join(' ')} -3 -4`,'9998 9999']]),
    pack({
        title: 'Missing Number (1 to N)', difficulty: 'Easy', tags: ['Math', 'Arrays'],
        statement: 'A list originally contained every integer from 1 through n exactly once. One integer was removed and the remaining values were shuffled. Find the removed integer.\n\n## Constraints\n- 2 <= n <= 200000\n- The input contains n - 1 distinct integers between 1 and n\n\nUse a 64-bit integer if your solution calculates the sum of all numbers from 1 through n. Read a single instance, without a test-case count.',
        inputFormat: 'First line: n. Second line: the n - 1 remaining integers.',
        outputFormat: 'Print the missing integer.',
        samples: [{ input:'6\n6 2 1 5 3', output:'4', explanation:'Only 4 is absent from the range 1 through 6.' }],
    }, [['2\n1','2'],['2\n2','1'],['5\n2 3 4 5','1'],['5\n4 1 3 2','5'],['7\n7 1 5 2 6 3','4'],[`200000\n${Array.from({length:199999},(_,i)=>i+1).join(' ')}`,'200000']]),
    pack({
        title: 'Longest Repetition (DNA)', difficulty: 'Easy', tags: ['Strings', 'Implementation'],
        statement: 'A DNA string contains only A, C, G, and T. Find the length of its longest uninterrupted block of one repeated character. Count adjacent characters, not the total frequency across the string.\n\n## Constraints\n- 1 <= string length <= 100000\n- Every character is A, C, G, or T\n\nRead one string. There is no test-case count.',
        inputFormat: 'One line contains the DNA string.',
        outputFormat: 'Print the length of the longest block of equal adjacent characters.',
        samples: [{input:'AAGGGGCTT',output:'4',explanation:'The four consecutive G characters form the longest block.'},{input:'ACGTAC',output:'1',explanation:'No neighboring characters are equal.'}],
    }, [['A','1'],['TTTTT','5'],['ACGT','1'],['AAACCG','3'],['ACGTTTT','4'],['AAAACCCCGG','4'],['ATATATAT','1'],['G'.repeat(100000),'100000']]),
];
