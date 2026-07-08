<script setup>
// import {useAPIFetch} from '~/composables/useAPIFetch'
import { ref } from 'vue'
import { initMenu, wamp_topic } from '@/composables/PayloadTc/SideNav.ts'
import { tCstore } from '@/stores/tele_command'

const statusStore = tCstore()
initMenu(3)
const selectedFileName = ref('')
const fileNames = ref([])
const trigger_request = ref({});

// Load TC file names
(async () => {
  const data = await useSimpleAPIFetch(
    `/tc/get_tc_file_names`,
    { method: 'GET' },
    'Failed to Get TC File Names from Database',
    wamp_topic,
  )
  if (data && Array.isArray(data) && data.length > 0) {
    fileNames.value = data.map(opt => ({ name: opt }))
  }
})()

async function executeTestProcedure() {
  const data = await useSimpleAPIFetch(
    `/tc/trigger_file_execution`,
    {
      method: 'post',
      body: { file_name: selectedFileName.value.name, file_content: '' },
    },
    'Failed to Trigger File',
    wamp_topic,
  )
  if (data && data.length > 0) {
    selectedFileName.value = ''
  }
}
</script>

<template>
  <AppName appname="Telecommand" />
  <div class="grid pt-4">
    <div class="col-2">
      <h3>Select File</h3>
      <Select
        v-model="selectedFileName"
        :auto-filter-focus="true"
        :options="fileNames"
        filter
        show-clear
        option-label="name"
        placeholder="Select File"
        class="w-full md:w-20rem"
      />
    </div>
  </div>

  <div v-if="selectedFileName" class="grid pt-4">
    <div class="col-6 gap-2">
      <Button
        label="Trigger Execution"
        severity="info"
        raised
        @click="executeTestProcedure"
      />
    </div>
  </div>

  <div class="grid mt-4">
    <div class="col-12">
      <ExecutionStatus :store="statusStore" height="150px" />
    </div>
  </div>
</template>
