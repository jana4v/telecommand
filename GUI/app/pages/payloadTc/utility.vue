<script setup>
import { initMenu, wamp_topic } from '@/composables/PayloadTc/SideNav.ts'
import { tCstore } from '@/stores/tele_command'

const statusStore = tCstore()
definePageMeta({
  title: 'Telecommand',
})

initMenu(4)
const cfgNumberString = ref('')
const testProcedure = ref('')
const showTestProcedure = ref(false)
const showExecuteTestProcedureButton = ref(false)
const test_parameter_names = ref([])
const selected_test_parameter = ref('')
const boa = ref([])
const selected_boa = ref('')
const generated_test_procedure = ref({})

const docx = ref()
const docxUrl = `http://${import.meta.dev ? window.location.hostname : window.location.host}/file_n/procedures.docx`

// Load test parameter names
(async () => {
  const data = await useSimpleAPIFetch(
    `/payloadtc/database/options/test-parameters`,
    { method: 'GET' },
    'Failed to Get Test Parameter Names from Database',
  )
  if (data?.items?.length > 0) {
    test_parameter_names.value = data.items.map(opt => ({ name: opt }))
  }
})();

// Load BOA column names
(async () => {
  const data = await useSimpleAPIFetch(
    `/payloadtc/database/boa-column-names`,
    { method: 'GET' },
    'Failed to Get Boa Column Names from Database',
  )
  if (data?.items?.length > 0) {
    boa.value = data.items.map(opt => ({ name: opt }))
  }
})()

async function gnerateTestProcedureDocument() {
  if (cfgNumberString.value.length == 0) {
    alert('Please Enter Config Numbers...')
    return
  }

  const body = {
    configs_str: cfgNumberString.value,
    request_is_to_turn_on: true,
    boa_column_name: selected_boa.value?.name,
    parameter: selected_test_parameter.value?.name,
  }
  const data = await useSimpleAPIFetch(
    `/tc/generate_test_procedure_document`,
    {
      method: 'post',
      body,
    },
    'Failed to Generate Test Procedure Document',
    wamp_topic,
  )
  if (data && data.length > 0) {
    docx.value.click()
  }
}

async function gnerateTestProcedureTurnOffDocument() {
  if (cfgNumberString.value.length == 0) {
    alert('Please Enter Config Numbers...')
    return
  }

  const body = {
    configs_str: cfgNumberString.value,
    request_is_to_turn_on: true,
    boa_column_name: selected_boa.value?.name,
    parameter: selected_test_parameter.value?.name,
  }
  const data = await useSimpleAPIFetch(
    `/tc/generate_test_procedure_turn_off_document`,
    {
      method: 'post',
      body,
    },
    'Failed to Generate Test Procedure Document',
    wamp_topic,
  )
  if (data && data.length > 0) {
    docx.value.click()
  }
}
</script>

<template>
  <div class="content">
    <AppName appname="Telecommand" />
    <div class="grid grid-cols-3 gap-4 pt-4">
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
          class="w-full md:w-20rem"
        />
      </div>
    </div>

    <div class="mt-4 flex gap-2">
      <div class="">
        <Button
          label="Generate Test Procedures Document"
          severity="info"
          raised
          @click="gnerateTestProcedureDocument"
        />
      </div>
      <div class="">
        <Button
          label="Generate Test Procedures OFF Document"
          severity="info"
          raised
          @click="gnerateTestProcedureTurnOffDocument"
        />
      </div>
    </div>
    <a ref="docx" :href="docxUrl" />
    <div class="grid mt-4">
      <div class="col-12">
        <ExecutionStatus :store="statusStore" height="150px" />
      </div>
    </div>
  </div>
</template>

<style lang="scss"></style>
