<script setup>
import { ref } from 'vue'
import { initMenu, wamp_topic } from '@/composables/PayloadTc/SideNav.ts'
import { tCstore } from '@/stores/tele_command'

definePageMeta({
  title: 'Telecommand - CFG Based Commands',
})

initMenu(0)
const cfgNumberString = ref('')
const testProcedure = ref('')
const showTestProcedure = ref(false)
const showExecuteTestProcedureButton = ref(false)
const test_parameter_names = ref([])
const selected_test_parameter = ref('')
const boa = ref([])
const selected_boa = ref('')
const generated_test_procedure = ref({})
const statusStore = tCstore()
const pageError = ref('')

// Load test parameter names
;(async () => {
  const data = await useSimpleAPIFetch(
    `/payloadtc/database/options/test-parameters`,
    { method: 'GET' },
    'Failed to Get Test Parameter Names from Database',
  )
  if (data?.items?.length > 0) {
    test_parameter_names.value = data.items.map(opt => ({ name: opt }))
  }
})()

// Load BOA column names
;(async () => {
  const data = await useSimpleAPIFetch(
    `/payloadtc/database/boa-column-names`,
    { method: 'GET' },
    'Failed to Get Boa Column Names from Database',
  )
  if (data?.items?.length > 0) {
    boa.value = data.items.map(opt => ({ name: opt }))
  }
})()

async function gnerateTestProcedureToTurnOff() {
  testProcedure.value = ''
  showTestProcedure.value = false
  showExecuteTestProcedureButton.value = false
  const body = {
    configs_str: cfgNumberString.value,
    request_is_to_turn_on: false,
  }
  const data = await useSimpleAPIFetch(
    `/tc/set_cfgs_off`,
    { method: 'post', body },
    'Failed to Generate Procedure',
    wamp_topic,
  )
  if (data) {
    generated_test_procedure.value = data
    testProcedure.value = data.file_content
    showTestProcedure.value = data.file_content.length > 0
    showExecuteTestProcedureButton.value = data.file_content.length > 0
  }
}

async function gnerateTestProcedureToTurnOn() {
  pageError.value = ''
  if (cfgNumberString.value.length === 0) {
    pageError.value = 'Please enter config numbers.'
    return
  }
  testProcedure.value = ''
  showTestProcedure.value = false
  showExecuteTestProcedureButton.value = false
  showTestProcedure.value = false
  const body = {
    configs_str: cfgNumberString.value,
    request_is_to_turn_on: true,
    boa_column_name: selected_boa.value?.name,
    parameter: selected_test_parameter.value?.name,
  }
  const data = await useSimpleAPIFetch(
    `/tc/set_cfgs_on`,
    { method: 'post', body },
    'Failed to Generate Procedure',
    wamp_topic,
  )
  if (data) {
    generated_test_procedure.value = data
    testProcedure.value = data.file_content
    showTestProcedure.value = data.file_content.length > 0
    showExecuteTestProcedureButton.value = data.file_content.length > 0
  }
}

async function gnerateTestProcedureToConfigurSwitches() {
  testProcedure.value = ''
  showTestProcedure.value = false
  showExecuteTestProcedureButton.value = false
  showTestProcedure.value = false
  const body = {
    configs_str: cfgNumberString.value,
    request_is_to_turn_on: false,
    change_only_switches: true,
  }
  const data = await useSimpleAPIFetch(
    `/tc/set_cfgs_on`,
    { method: 'post', body },
    'Failed to Generate Procedure',
    wamp_topic,
  )
  if (data) {
    generated_test_procedure.value = data
    testProcedure.value = data.file_content
    showTestProcedure.value = data.file_content.length > 0
    showExecuteTestProcedureButton.value = data.file_content.length > 0
  }
}

async function gnerateTestProcedureToTurnOffAllPayload() {
  testProcedure.value = ''
  showTestProcedure.value = false
  showExecuteTestProcedureButton.value = false
  showTestProcedure.value = false
  const body = {}
  const data = await useSimpleAPIFetch(
    `/tc/set_all_payload_off`,
    { method: 'post', body },
    'Failed to Generate Procedure',
    wamp_topic,
  )
  if (data) {
    generated_test_procedure.value = data
    testProcedure.value = data.file_content
    showTestProcedure.value = data.file_content.length > 0
    showExecuteTestProcedureButton.value = data.file_content.length > 0
  }
}

async function executeTestProcedure() {
  const data = await useSimpleAPIFetch(
    `/tc/executeTestProcedure`,
    {
      method: 'post',
      body: generated_test_procedure.value,
    },
    'Failed to Execute Procedure',
    wamp_topic,
  )
  if (data && data.length > 0) {
    showExecuteTestProcedureButton.value = false
  }
}
</script>

<template>
  <div class="content">
    <AppName appname="Telecommand" />
    <Message v-if="pageError" severity="error" class="mb-3">
      {{ pageError }}
    </Message>
    <div class="grid grid-cols-4 gap-4 pt-4">
      <div>
        <div>
          <label for="cfgNumberString">
            <h3>Enter Config Numbers</h3>
          </label>
          <InputText
            id="cfgNumberString"
            v-model="cfgNumberString"
            aria-describedby="cfgNumberString-help"
            class="w-full"
          />
        </div>

        <div>
          <label for="cfgNumberString">
            <h3>Test Parameter</h3>
          </label>
          <Select
            v-model="selected_test_parameter"
            :auto-filter-focus="true"
            :options="test_parameter_names"
            filter
            show-clear
            option-label="name"
            placeholder="Select Test Parameter"
            class="w-full"
          />
        </div>
        <div>
          <label for="cfgNumberString">
            <h3>BOA</h3>
          </label>
          <Select
            v-model="selected_boa"
            :auto-filter-focus="true"
            :options="boa"
            filter
            show-clear
            option-label="name"
            placeholder="Select Boa"
            class="w-full"
          />
        </div>

        <div>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <div>
              <Button class="w-full" label="Turn on" severity="warning" raised @click="gnerateTestProcedureToTurnOn" />
            </div>

            <div>
              <Button class="w-full" label="Turn off" severity="info" raised @click="gnerateTestProcedureToTurnOff" />
            </div>
          </div>
        </div>

        <div>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <div>
              <Button
                class="w-full"
                label="Configure Switches"
                severity="info"
                raised
                @click="gnerateTestProcedureToConfigurSwitches"
              />
            </div>

            <div>
              <Button
                class="w-full"
                label="All Payload Off"
                severity="info"
                raised
                @click="gnerateTestProcedureToTurnOffAllPayload"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="mt-4">
            <Button
              v-if="showExecuteTestProcedureButton"
              class="w-full"
              label="Execute Test Procedure"
              severity="warn"
              raised
              @click="executeTestProcedure"
            />
          </div>
        </div>
      </div>
      <div class="col-2 gap-3">
        <payload-tc-test-procedure-display :rows="11" :test-procedure="testProcedure" />
      </div>
    </div>

    <div class="grid mt-1">
      <div class="col-12">
        <ExecutionStatus :store="statusStore" height="150px" />
      </div>
    </div>
  </div>
</template>

<style lang="scss"></style>
