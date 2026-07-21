import type { SkillGroup } from "@/lib/schema";

function LevelDots({ level }: { level: number }) {
  return (
    <span className="rs-level">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`rs-level-dot${n <= level ? " rs-level-dot--on" : ""}`}
        />
      ))}
    </span>
  );
}

// One skill group — an atomic pagination block ('groups' and 'bars' displays).
export function SkillGroupBlock({
  group,
  display,
}: {
  group: SkillGroup;
  display: "groups" | "bars";
}) {
  return (
    <div className="rs-skill-group" data-item-id={group.id}>
      <span className="rs-skill-group-name">{group.name}: </span>
      {display === "bars" ? (
        group.skills.map((skill, i) => (
          <span key={skill.id}>
            {i > 0 && ", "}
            {skill.name}
            {skill.level != null && <LevelDots level={skill.level} />}
          </span>
        ))
      ) : (
        <span>{group.skills.map((s) => s.name).join(", ")}</span>
      )}
    </div>
  );
}

// The 'tags' display renders all skills as one flowing chip cloud — a single
// atomic block.
export function SkillTagsBlock({ groups }: { groups: SkillGroup[] }) {
  return (
    <div className="rs-tags">
      {groups
        .flatMap((g) => g.skills)
        .map((skill) => (
          <span className="rs-tag" key={skill.id}>
            {skill.name}
          </span>
        ))}
    </div>
  );
}
