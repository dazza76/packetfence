/**
 * Custom Vuelidate Validators
 *
 * See Builtin Validators: https://monterail.github.io/vuelidate/#sub-builtin-validators
 *
 * Vuelidate version 0.7.3 functions that do not handle Promises:
 *
 *  - and
 *  - or
 *  - not
 *
**/
import store from '@/store'
import { parse, format, isValid, compareAsc } from 'date-fns'

const _common = require('vuelidate/lib/validators/common')

// `and` replacement, handles Promises
export const and = (...validators) => {
  return _common.withParams({ type: 'and' }, function (...args) {
    return (
      validators.length > 0 &&
      Promise.all(validators.map(fn => fn.apply(this, args))).then(values => {
        return values.reduce((valid, value) => {
          return valid && value
        }, true)
      })
    )
  })
}

// `or` replacement, handles Promises
export const or = (...validators) => {
  return _common.withParams({ type: 'and' }, function (...args) {
    return (
      validators.length > 0 &&
      Promise.all(validators.map(fn => fn.apply(this, args))).then(values => {
        return values.reduce((valid, value) => {
          return valid || value
        }, false)
      })
    )
  })
}

// `not` replacement, handles Promises
export const not = (validator) => {
  return _common.withParams({ type: 'not' }, function (value, vm) {
    let newValue = validator.call(this, value, vm)
    if (Promise.resolve(newValue) === newValue) { // is it a Promise?
      // wait for promise to resolve before inverting it
      return newValue.then((value) => !value)
    }
    return !newValue
  })
}

export const conditional = (conditional) => {
  return (0, _common.withParams)({
    type: 'conditional',
    conditional: conditional
  }, function () {
    return conditional
  })
}

export const inArray = (array) => {
  return (0, _common.withParams)({
    type: 'inArray',
    array: array
  }, function (value) {
    return !(0, _common.req)(value) || array.includes(value)
  })
}

export const isDateFormat = (dateFormat) => {
  return (0, _common.withParams)({
    type: 'isDateFormat',
    dateFormat: dateFormat
  }, function (value) {
    return !(0, _common.req)(value) || format(parse(value), dateFormat) === value || dateFormat.replace(/[a-z]/gi, '0') === value
  })
}

export const compareDate = (comparison, date = new Date(), dateFormat = 'YYYY-MM-DD HH:mm:ss') => {
  return (0, _common.withParams)({
    type: 'compareDate',
    comparison: comparison,
    date: date,
    dateFormat: dateFormat
  }, function (value) {
    // ignore empty or zero'd (0000-00-00...)
    if (!value || value === dateFormat.replace(/[a-z]/gi, '0')) return true
    // round date/value using dateFormat
    date = parse(format((date instanceof Date && isValid(date) ? date : parse(date)), dateFormat))
    value = parse(format((value instanceof Date && isValid(value) ? value : parse(value)), dateFormat))
    // compare
    const cmp = compareAsc(value, date)
    switch (comparison.toLowerCase()) {
      case '>': case 'gt': return (cmp > 0)
      case '>=': case 'gte': return (cmp >= 0)
      case '<': case 'lt': return (cmp < 0)
      case '<=': case 'lte': return (cmp <= 0)
      case '===': case 'eq': return (cmp === 0)
      case '!==': case 'ne': return (cmp !== 0)
      default: return false
    }
  })
}

export const categoryIdNumberExists = (value, component) => {
  if (!value || !/^\d+$/.test(value)) return true
  return store.dispatch('config/getRoles').then((response) => {
    return (response.filter(role => role.category_id === value).length > 0)
  }).catch(() => {
    return true
  })
}

export const categoryIdStringExists = (value, component) => {
  if (!value || /^\d+$/.test(value)) return true
  return store.dispatch('config/getRoles').then((response) => {
    return (response.filter(role => role.name.toLowerCase() === value.toLowerCase()).length > 0)
  }).catch(() => {
    return true
  })
}

export const sourceExists = (value, component) => {
  if (!value) return true
  return store.dispatch('config/getSources').then((response) => {
    return (response.filter(source => source.id.toLowerCase() === value.toLowerCase()).length > 0)
  }).catch(() => {
    return true
  })
}

export const nodeExists = (value, component) => {
  if (!value || value.length !== 17) return true
  return store.dispatch('$_nodes/exists', value).then(() => {
    return false
  }).catch(() => {
    return true
  })
}

export const userExists = (value, component) => {
  if (!value) return true
  return store.dispatch('$_users/exists', value).then(results => {
    return true
  }).catch(() => {
    return false
  })
}

export const userNotExists = (value, component) => {
  if (!value) return true
  return store.dispatch('$_users/exists', value).then(results => {
    return false
  }).catch(() => {
    return true
  })
}
