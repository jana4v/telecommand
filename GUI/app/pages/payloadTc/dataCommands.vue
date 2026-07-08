<script setup>
import { ref } from 'vue'
import { initMenu, wamp_topic } from '@/composables/PayloadTc/SideNav.ts'
import { tCstore } from '@/stores/tele_command'

const testProcedure = ref('')
const showTestProcedure = ref(false)
const showExecuteTestProcedureButton = ref(false)
const data_commands = ref([])
const selected_data_command = ref(null)
const data_cmd_values = ref([])
const selected_value = ref(null)
const dispaly_value_to_data_code_map = ref({})
const commandsList = ref([])
const selected_data_command_list = ref([])
const selectedCommands = ref([])
const generated_test_procedure = ref({})

const statusStore = tCstore()
definePageMeta({
  title: 'PAPERT Application',
})

initMenu(1)

// Load data commands list
;(async () => {
  const data = await useSimpleAPIFetch(
    `/tc/get_data_commands_list`,
    { method: 'GET' },
    'Failed to Get Data commands List from Database',
    wamp_topic,
  )
  if (data && Array.isArray(data) && data.length > 0) {
    data_commands.value = data.map(opt => ({ tc: opt }))
  }
})()

async function fetchValues() {
  const data = await useSimpleAPIFetch(
    `/tc/get_data_command_values`,
    {
      method: 'POST',
      body: [selected_data_command.value.tc],
    },
    'Failed to Get Data command Values from Database',
    wamp_topic,
  )
  if (data) {
    data_cmd_values.value = Object.keys(data).map(opt => ({ tc: opt }))
    dispaly_value_to_data_code_map.value = data
  }
}

function onValueChanged(value) {
  const data = {
    tc: selected_data_command.value.tc,
    value: value.tc,
    code: dispaly_value_to_data_code_map.value[value.tc],
  }
  data.id = `${data.tc}_${value.tc}`
  if (!selected_data_command_list.value.includes(data.id)) {
    commandsList.value.push(data)
    selected_data_command_list.value.push(selected_data_command.value.tc)
    selected_data_command_list.value.push(data.id)
  }
}

async function gnerateTestProcedure() {
  showTestProcedure.value = false
  if (commandsList.value.length === 0)
    return
  const cmds = commandsList.value.map(
    obj => `${obj.tc} ${obj.code}: ${obj.value}`,
  )

  const data = await useSimpleAPIFetch(
    `/tc/generate_data_commands`,
    {
      method: 'post',
      body: { commands: cmds },
    },
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

const columns = ref([
  { field: 'tc', header: 'COMMAND' },
  { field: 'code', header: 'CODE' },
  { field: 'value', header: 'VALUE' },
])

function onRowReorder(event) {
  commandsList.value = event.value
}

function deleteAll() {
  commandsList.value = []
  selected_data_command_list.value = []
  selected_data_command.value = ''
  selected_value.value = ''
  selectedCommands.value = []
}

function deleteSelected() {
  commandsList.value = commandsList.value.filter(
    item =>
      !selectedCommands.value.some(
        selectedItem => selectedItem.id === item.id,
      ),
  )
  if (commandsList.value.length === 0) {
    selected_data_command.value = ''
    selected_value.value = ''
    selected_data_command_list.value = []
    selectedCommands.value = []
  }
}
</script>

<template>
  <div>
    <AppName appname="Telecommand" />
    <div class="grid grid-cols-12 gap-4 pt-4">
      <div class="col-span-5">
        <div>
          <div>
            <label for="cfgNumberString">
              <h3>Select Command</h3>
            </label>
            <Select
              v-model="selected_data_command"
              :options="data_commands"
              :auto-filter-focus="true"
              filter
              option-label="tc"
              placeholder="Select File"
              class="w-full"
              @update:model-value="fetchValues"
            />
          </div>
          <div>
            <label for="Value">
              <h3>Select Value</h3>
            </label>
            <Select
              v-model="selected_value"
              :auto-filter-focus="true"
              :options="data_cmd_values"
              filter
              option-label="tc"
              placeholder="Select File"
              class="w-full"
              @update:model-value="onValueChanged"
            />
          </div>
        </div>

        <div>
          <DataTable
            v-model:selection="selectedCommands"
            :value="commandsList"
            resizable-columns
            column-resize-mode="fit"
            @row-reorder="onRowReorder"
          >
            <template #header>
              <div class="flex gap-4">
                <Button
                  type="button"
                  icon="pi pi-trash"
                  label="Delete Selected"
                  outlined
                  @click="deleteSelected"
                />
                <Button
                  type="button"
                  icon="pi pi-trash"
                  label="Clear All"
                  outlined
                  @click="deleteAll"
                />
              </div>
            </template>
            <Column selection-mode="multiple" header-style="width: 3rem" />
            <Column
              row-reorder
              header-style="width: 3rem"
              :reorderable-column="false"
            />
            <Column
              v-for="col of columns"
              :key="col.field"
              :field="col.field"
              :header="col.header"
            />
          </DataTable>

          <div class="grid grid-cols-2 gap-2">
            <div class="mt-4">
              <Button
                class="w-full"
                label="Generate Procedure"
                severity="info"
                raised
                @click="gnerateTestProcedure"
              />
            </div>
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
      </div>

      <div class="col-span-7">
        <div>
          <payload-tc-test-procedure-display
            :cols="55"
            :rows="11"
            :test-procedure="testProcedure"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2" />

    <div class="grid">
      <div class="col-6">
        <div class="grid pt-5">
          <div v-if="showTestProcedure" class="col-6 gap-2" />
        </div>
      </div>
    </div>

    <div class="grid mt-4">
      <div class="col-12">
        <ExecutionStatus :store="statusStore" height="150px" />
      </div>
    </div>
  </div>
</template>
