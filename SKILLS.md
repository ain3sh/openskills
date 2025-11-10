<!-- OpenSkills Generated - Do Not Edit Manually -->
<!-- Last Updated: 2025-11-10T17:38:53.582Z -->
<!-- Skills Count: 4 -->

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>test-clean</name>
<description>Test skill with no warnings</description>
<location>project</location>
</skill>

<skill>
<name>test-perms</name>
<description>Test skill with permissions</description>
<location>project</location>
</skill>

<skill>
<name>test-two-msg</name>
<description>Test skill</description>
<location>project</location>
</skill>

<skill>
<name>hello-world</name>
<description>Example built-in skill that demonstrates the skill format and serves as a template</description>
<location>global</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
