// plan.json shot id → view + builder.
import {HookView, buildHook, BrandView, buildBrand, AgentView, buildAgent, OutroView, buildOutro} from './titles.jsx';
import {site, code, prompt, skill, find, share} from './sites.jsx';
const S = {site, code, prompt, skill, find, share};
export const SHOT_VIEWS = {hook: HookView, brand: BrandView, agent: AgentView, outro: OutroView, ...Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.View]))};
export const SHOT_BUILDERS = {hook: buildHook, brand: buildBrand, agent: buildAgent, outro: buildOutro, ...Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.build]))};
