/**
 * Mixin for vuelidate form validation.
**/
import { createDebouncer } from 'promised-debounce'

export default {
  name: 'pfMixinValidation',
  props: {
    validation: {
      type: Object,
      default: null
    },
    invalidFeedback: {
      default: null
    },
    highlightValid: {
      type: Boolean,
      default: false
    },
    validationDebounce: {
      type: Number,
      default: 300
    },
    filter: {
      type: RegExp,
      default: null
    },
    lastValidValue: {
      type: String,
      default: null
    }
  },
  methods: {
    isValid () {
      if (this.validation && this.validation.$dirty) {
        if (this.validation.$invalid) {
          return false
        } else if (this.highlightValid) {
          return true
        }
      }
      return null
    },
    validate () {
      const _this = this
      if (this.validation) {
        this.$validationDebouncer({
          handler: () => {
            _this.validation.$touch()
          },
          time: this.validationDebounce
        })
      }
    },
    onChange (event) {
      if (this.filter) {
        // this.value is one char behind, wait until next tick for our v-model to update
        this.$nextTick(() => {
          if (this.value.length === 0) {
            this.lastValidValue = ''
          } else {
            if (this.filter.test(this.value)) {
              // good, remember
              this.lastValidValue = this.value
            } else {
              // bad, restore
              this.value = this.lastValidValue
            }
          }
        })
      }
    },
    stringifyFeedback (feedback) {
      if (feedback === null) return ''
      if (feedback instanceof Array) {
        let ret = ''
        feedback.forEach(f => {
          ret += ((ret !== '') ? ' ' : '') + this.stringifyFeedback(f)
        })
        return ret
      }
      if (feedback instanceof Object) {
        if (Object.values(feedback)[0] === true) {
          return Object.keys(feedback)[0]
        }
        return ''
      }
      return feedback
    },
    getInvalidFeedback () {
      return this.stringifyFeedback(this.invalidFeedback)
    }
  },
  created () {
    this.$validationDebouncer = createDebouncer()
  }
}
