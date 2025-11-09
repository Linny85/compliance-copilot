/* eslint-disable no-console */
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: false,
});

const files = project.getSourceFiles('src/**/*.ts?(x)');
let changed = 0;

for (const f of files) {
  const calls = f.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const c of calls) {
    // Pattern: .from('profiles') ... .eq('user_id', ...)
    const text = c.getText();
    if (text.includes(".from('profiles')") || text.includes('.from("profiles")')) {
      const chain = c.getFirstAncestorByKind(SyntaxKind.CallExpression) ?? c;
      const eqCalls = chain.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(x => x.getExpression().getText().endsWith('.eq'));
      for (const eq of eqCalls) {
        const args = eq.getArguments();
        if (args[0]?.getText().replace(/['"]/g, '') === 'user_id') {
          args[0].replaceWithText(`'id'`);
          changed++;
        }
      }
    }
  }
  if (f.isSaved() === false) f.saveSync();
}

project.saveSync();
console.log(`✅ Fixed ${changed} occurrence(s) of profiles.user_id → profiles.id.`);
