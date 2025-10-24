# Agent Development Rules

## TypeScript Type Safety

- NEVER use `as any` in TypeScript code
- Always fix type issues properly by:
  1. Using correct type imports
  2. Creating proper type assertions with specific types like `as NylasThread`
  3. Fixing underlying type mismatches instead of bypassing them
  4. Using proper type guards and null checks
- This is a critical rule that must be followed at all times
- Use `npm run ts-check-windows` and `npm run ts-check-main` instead of building to check for TypeScript errors (faster and more focused)

## Component Organization

- Components should be co-located with the features that use them
- Only put components in the root `ui/` folder if they are truly shared across multiple features/pages
- Do NOT create `components/` folders within feature directories
- Components that are only used once should be in the same directory as the component that uses them

## Backend

- Don't worry about migrating the database. The user will always do it.
- Don't create sloppy try-catches over lots of different logic. try-catch should be targeted at a particular thing that could fail.
- NEVER use `await import()` - if you need to use it, you're doing something wrong
- Server actions should be imported normally, not dynamically
- Only code in app/ should call code inside of app/. You're making this mistake a lot with actions.ts files getting used by lib/ files.

## Error Handling

- Don't wrap entire functions in try-catch blocks
- Only use try-catch around specific operations that you expect might fail and where you can meaningfully recover
- If you catch an error, you should know exactly which statement threw it
- Most database queries in well-formed applications don't need individual try-catch handling
- If the database is down, let the entire operation fail rather than catching everything defensively

## Frontend

- Always use braces. Don't do "if (x) return y;"
- In the frontend, calls to the API should be put into separate functions. Perhaps in the same file as the component that uses it. Perhaps not.
- Don't just put SVGs straight into a bigger component. Break it out into a separate component.
- No default exports except for the page.tsx files.
- Pages default exports should just be called function Page().
- Use theme-aware colors for text and backgrounds as defined in global.css
- Prefer using flex gaps over margins between elements
- Use `Props` instead of `WhateverComponentNameProps`.

## File Organization

- Use server actions instead of API routes when possible
- Organize related functionality into separate files (e.g., thread-actions.ts for thread operations)
- Keep services and utilities close to where they're used
- Only extract to shared locations when truly needed across multiple features
