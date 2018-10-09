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

/**
 * Misc local helpers
**/

// helper, gets the unique id of a given $v
const idOfV = ($v) => {
  return $v.__ob__.dep.id
}

// helper, gets the parent $v of a given id
const parentVofId = ($v, id) => {
  const params = Object.entries($v.$params)
  for (let i = 0; i < params.length; i++) {
    const [param] = params[i] // destructure
    if (typeof $v[param] === 'object' && typeof $v[param].$model === 'object') {
      if ($v[param].$model && '__ob__' in $v[param].$model) {
        if (idOfV($v[param].$model) === id) return $v
      }
      // recurse
      if (parentVofId($v[param], id)) return $v[param]
    }
  }
  return undefined
}

/**
 * Vuelidation functions
**/

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

export const limitSiblingFieldTypes = (limit) => {
  return (0, _common.withParams)({
    type: 'limitSiblingFieldTypes',
    limit: limit
  }, function (value, field) {
    let count = 0
    // get the |id| of this
    const id = idOfV(field)
    // find |parent|, using |id|
    const parent = parentVofId(this.$v, id)
    // backup and destructure parent params
    const params = Object.entries(parent.$params)
    // iterate through all params
    for (let i = 0; i < params.length; i++) {
      const [param] = params[i] // destructure
      if (parent[param].$model === undefined) continue // ignore empty models
      if (idOfV(parent[param].$model) === id) continue // ignore (self)
      if (parent[param].$model.type === field.type) count += 1 // increment count
    }
    return (count <= limit)
  })
}

export const requireAllSiblingFieldTypes = (...fieldTypes) => {
  return (0, _common.withParams)({
    type: 'requireAllSiblingFieldTypes',
    fieldTypes: fieldTypes
  }, function (value, field) {
    // dereference, preserve original
    let _fieldTypes = JSON.parse(JSON.stringify(fieldTypes))
    // get the |id| of this
    const id = idOfV(field)
    // find |parent|, using |id|
    const parent = parentVofId(this.$v, id)
    // backup and destructure parent params
    const params = Object.entries(parent.$params)
    // iterate through all params
    for (let i = 0; i < params.length; i++) {
      const [param] = params[i] // destructure
      if (parent[param].$model === undefined) continue // ignore empty models
      if (idOfV(parent[param].$model) === id) continue // ignore (self)
      // iterate through _fieldTypes and substitute
      _fieldTypes = _fieldTypes.map(fieldType => {
        // substitute the fieldType with |true| if it exists
        return (parent[param].$model.type === fieldType) ? true : fieldType
      })
    }
    // return |true| only if the entire array consists of |true|,
    // anything else return false
    return _fieldTypes.reduce((bool, fieldType) => { return bool && (fieldType === true) }, true)
  })
}

export const requireAnySiblingFieldTypes = (...fieldTypes) => {
  return (0, _common.withParams)({
    type: 'requireAnySiblingFieldTypes',
    fieldTypes: fieldTypes
  }, function (value, field) {
    // dereference, preserve original
    let _fieldTypes = JSON.parse(JSON.stringify(fieldTypes))
    // get the |id| of this
    const id = idOfV(field)
    // find |parent|, using |id|
    const parent = parentVofId(this.$v, id)
    // backup and destructure parent params
    const params = Object.entries(parent.$params)
    // iterate through all params
    for (let i = 0; i < params.length; i++) {
      const [param] = params[i] // destructure
      if (parent[param].$model === undefined) continue // ignore empty models
      if (idOfV(parent[param].$model) === id) continue // ignore (self)
      // iterate through _fieldTypes and substitute
      _fieldTypes = _fieldTypes.map(fieldType => {
        // substitute the fieldType with |true| if it exists
        return (parent[param].$model.type === fieldType) ? true : fieldType
      })
    }
    // return |true| only if any element in the array consists of |true|,
    // otherwise return false
    return _fieldTypes.includes(true)
  })
}

export const restrictAllSiblingFieldTypes = (...fieldTypes) => {
  return (0, _common.withParams)({
    type: 'restrictAllSiblingFieldTypes',
    fieldTypes: fieldTypes
  }, function (value, field) {
    // dereference, preserve original
    let _fieldTypes = JSON.parse(JSON.stringify(fieldTypes))
    // get the |id| of this
    const id = idOfV(field)
    // find |parent|, using |id|
    const parent = parentVofId(this.$v, id)
    // backup and destructure parent params
    const params = Object.entries(parent.$params)
    // iterate through all params
    for (let i = 0; i < params.length; i++) {
      const [param] = params[i] // destructure
      if (parent[param].$model === undefined) continue // ignore empty models
      if (idOfV(parent[param].$model) === id) continue // ignore (self)
      // iterate through _fieldTypes and substitute
      _fieldTypes = _fieldTypes.map(fieldType => {
        // substitute the fieldType with |true| if it exists
        return (parent[param].$model.type === fieldType) ? true : fieldType
      })
    }
    // return |true| only if the entire array consists of |true|,
    // anything else return false
    return !_fieldTypes.reduce((bool, fieldType) => { return bool && (fieldType === true) }, true)
  })
}

export const restrictAnySiblingFieldTypes = (...fieldTypes) => {
  return (0, _common.withParams)({
    type: 'restrictAnySiblingFieldTypes',
    fieldTypes: fieldTypes
  }, function (value, field) {
    // dereference, preserve original
    let _fieldTypes = JSON.parse(JSON.stringify(fieldTypes))
    // get the |id| of this
    const id = idOfV(field)
    // find |parent|, using |id|
    const parent = parentVofId(this.$v, id)
    // backup and destructure parent params
    const params = Object.entries(parent.$params)
    // iterate through all params
    for (let i = 0; i < params.length; i++) {
      const [param] = params[i] // destructure
      if (parent[param].$model === undefined) continue // ignore empty models
      if (idOfV(parent[param].$model) === id) continue // ignore (self)
      // iterate through _fieldTypes and substitute
      _fieldTypes = _fieldTypes.map(fieldType => {
        // substitute the fieldType with |true| if it exists
        return (parent[param].$model.type === fieldType) ? true : fieldType
      })
    }
    // return |true| only if any element in the array consists of |true|,
    // otherwise return false
    return !_fieldTypes.includes(true)
  })
}
