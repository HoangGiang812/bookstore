export const isEmail = (e='') => /.+@.+\..+/.test(e);
export const required = (v) => (v===undefined || v===null || v==='') ? 'Trường này là bắt buộc' : null;
export const minLen = (n) => (v='') => v.length<n ? `Tối thiểu ${n} ký tự` : null;
export const validate = (rules) => (data) => {
  const errs = {};
  for (const k in rules) {
    const fns = Array.isArray(rules[k]) ? rules[k] : [rules[k]];
    for (const fn of fns) {
      const m = fn(data[k]);
      if (m) { errs[k]=m; break; }
    }
  }
  return errs;
};
