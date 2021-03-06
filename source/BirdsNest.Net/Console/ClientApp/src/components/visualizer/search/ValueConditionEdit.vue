<!-- Copyright (c) 2019-2020 "20Road"
20Road Limited [https://www.20road.com]

This file is part of Birdsnest Explorer.

Birdsnest Explorer is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see http://www.gnu.org/licenses/.
-->
<template>
	<div v-if="condition !== null" class="dialogWrapper">
		<div id="conditionEdit" class="dialog">
			<fieldset class="fieldset">
				<legend>{{ $t('word_Condition') }}</legend>
				<div id="editControls">
					<!-- Reference -->
					<div class="input-group">
						<span class="input-group-label">{{ $t('phrase_Referenced_Item') }}</span>
						<select class="input-group-field" v-model="condition.name" v-on:change="onSelectedItemChanged">
							<option v-for="item in availableItems" :value="item.name" :key="item.name">{{ item.name }}</option>
						</select>
					</div>

					<!-- Property -->
					<div class="input-group" v-if="condition.name !== null">
						<span class="input-group-label">{{ $t('word_Property') }}</span>
						<select
							class="small-8 input-group-field"
							v-model="condition.property"
							:disabled="!isLabelSet"
						>
							<option v-for="prop in properties" :key="prop" :value="prop">{{prop}}</option>
						</select>
					</div>

					<!-- booleans -->
					<div v-if="condition.property !== null && propertyType === 'boolean'" class="input-group">
						<span class="input-group-label">=</span>
						<div class="input-group-button">
							<select class="input-group-field" v-model="condition.value">
								<option value="TRUE">{{ $t('word_true') }}</option>
								<option value="FALSE">{{ $t('word_false') }}</option>
							</select>
						</div>
					</div>

					<!-- string input -->
					<div v-if="condition.property !== null && propertyType === 'string'" class="input-group">
						<div class="input-group-button">
							<select v-model="condition.operator" class="input-group-field">
								<option v-for="op in operators" :key="op" :value="op">{{op}}</option>
							</select>
						</div>
						<input
							id="searchStringInput"
							v-model="condition.value"
							class="input-group-field"
							autocomplete="on"
							type="search"
							placeholder="*"
							v-on:input="autocompleteDebounce"
							list="completes"
						/>
						<datalist id="completes">
							<option v-for="opt in autocompleteList" :key="opt">{{opt}}</option>
						</datalist>
					</div>

					<!-- number input -->
					<div v-if="condition.property !== null && propertyType === 'number'" class="input-group">
						<div class="input-group-button">
							<select v-model="condition.operator" class="input-group-field">
								<option v-for="op in operators" :key="op" :value="op">{{op}}</option>
							</select>
						</div>
						<input
							v-model.number="condition.value"
							class="input-group-field"
							type="search"
							autocomplete="off"
							placeholder="*"
						/>
					</div>

					<!-- Not -->
					<div
						v-if="propertyType === 'string' || propertyType === 'number'"
						class="grid-x grid-margin-x align-top"
						:key="$t('visualizer.search.not_descript')"
					>
						<div class="cell shrink">{{ $t('word_Not') }}:</div>
						<div class="cell auto">
							<div class="switch tiny" style="display: inline;">
								<input
									id="searchNot"
									v-model="condition.not"
									class="switch-input"
									type="checkbox"
									name="searchNot"
								/>
								<label class="switch-paddle" for="searchNot">
									<span class="show-for-sr">{{ $t('word_Not') }}</span>
								</label>
							</div>
						</div>
					</div>

					<!-- case sensitive -->
					<div
						v-if="propertyType === 'string'"
						id="searchCaseOptions"
						class="grid-x grid-margin-x align-top"
						:title="$t('visualizer.search.case_sensitive_descript')"
					>
						<div class="cell shrink">{{ $t('phrase_Case_Sensitive') }}:</div>
						<div class="cell auto">
							<div class="switch tiny" style="display: inline;">
								<input
									v-model="condition.caseSensitive"
									class="switch-input"
									id="searchCase"
									type="checkbox"
									name="searchCase"
								/>
								<label class="switch-paddle" for="searchCase">
									<span class="show-for-sr">{{ $t('phrase_Case_Sensitive') }}</span>
								</label>
							</div>
						</div>
					</div>

					<!-- alerts -->
					<div v-if="showAlert" id="alert">
						<i id="alertIcon" class="fas fa-exclamation-triangle"></i>
						<span id="alertMessage">{{alertMessage}}</span>
					</div>
				</div>
				<!-- close  -->
				<button
					v-on:click="onCloseClicked"
					class="close-button"
					aria-label="Close condition dialog"
					type="button"
				>
					<span>&times;</span>
				</button>
				<div class="grix-x align-middle">
					<button
						id="searchConditionSaveBtn"
						class="button small searchbutton-wide"
						:aria-label="$t('word_Save')"
						type="button"
						v-on:click="onSaveClicked"
						:disabled="!saveable"
					>{{ $t('word_Save') }}</button>
					<button
						id="searchConditionDeleteBtn"
						class="alert button small searchbutton-wide"
						:aria-label="$t('word_Delete')"
						type="button"
						v-on:click="onDeleteClicked"
					>{{ $t('word_Delete') }}</button>
					<button
						id="searchConditionCancelBtn"
						class="button small searchbutton-wide"
						:aria-label="$t('word_Cancel')"
						type="button"
						v-on:click="onCloseClicked"
					>{{ $t('word_Cancel') }}</button>
				</div>
			</fieldset>
		</div>
	</div>
</template>


<style scoped>

#alert {
	padding: 5px;
}

#alertIcon {
	height: 24px;
	width: 24px;
	margin: 0;
	color: orange;
}

#alertMessage {
	margin: 0 10px;
	padding: 5px;
	vertical-align: text-bottom;
}

/* override foundation 6 default for IE11 */
.input-group-field {
	flex-basis: auto;
}
</style>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import {
	ValueCondition,
	SearchItem,
	GetNode,
	GetEdge,
	ConditionOperators,
	copyCondition,
} from "@/assets/ts/visualizer/Search";
import { DataType } from "@/assets/ts/dataMap/DataType";
import { SearchItemType } from "@/assets/ts/visualizer/Search";
import webcrap from "@/assets/ts/webcrap/webcrap";
import { SearchStorePaths } from "@/store/modules/SearchStore";
import { api, Request } from "@/assets/ts/webcrap/apicrap";
import { SearchEdge } from "../../../assets/ts/visualizer/Search";

@Component
export default class ValueConditionEdit extends Vue {
	@Prop({ type: Object as () => ValueCondition, required: true })
	source: ValueCondition;

	condition: ValueCondition = null;
	selectedItem: SearchItem = null;

	autocompleteList: string[] = [];
	alertMessage = "";
	showAlert = false;
	saveable = true;

	created(): void {
		this.condition = copyCondition(this.source);
		this.onSelectedItemChanged();
	}

	get autocompleteDebounce(): Function {
		return webcrap.misc.debounce(this.updateAutocomplete, 250);
	}
	get availableItems(): SearchItem[] {
		const edges = this.$store.state.visualizer.search.search.edges;
		const nodes = this.$store.state.visualizer.search.search.nodes;
		return nodes.concat(edges);
	}

	get dataType(): DataType {
		if (webcrap.misc.isNullOrWhitespace(this.condition.name)) {
			return null;
		}
		if (this.selectedItem === null) {
			return null;
		}
		if (webcrap.misc.isNullOrWhitespace(this.selectedItem.label)) {
			return null;
		}
		const types = this.$store.state.pluginManager.nodeDataTypes[this.selectedItem.label];
		if (types) {
			return types;
		} else {
			return this.$store.state.pluginManager.edgeDataTypes[this.selectedItem.label];
		}
	}

	get properties(): string[] {
		if (this.dataType === null) {
			return [];
		} else {
			return this.dataType.propertyNames;
		}
	}

	get propertyType(): string {
		if (this.dataType !== null && webcrap.misc.isNullOrWhitespace(this.condition.property) === false) {
			if (Object.prototype.hasOwnProperty.call(this.dataType.properties, [this.condition.property])) {
				this.condition.type = this.dataType.properties[this.condition.property].type;
			} else {
				const firstkey = Object.keys(this.dataType.properties)[0];
				this.condition.type = this.dataType.properties[firstkey].type;
			}

			
			return this.condition.type;
		} else {
			return null;
		}
	}

	get operators(): string[] {
		if (webcrap.misc.isNullOrWhitespace(this.propertyType)) {
			return [];
		} else {
			return ConditionOperators[this.propertyType];
		}
	}

	get isLabelSet(): boolean {
		if (this.selectedItem === null || webcrap.misc.isNullOrWhitespace(this.selectedItem.label)) {
			return false;
		} else {
			return true;
		}
	}

	onSelectedItemChanged(): void {
		let item: SearchItem = null;
		let isNode = true;
		item = GetNode(this.condition.name, this.$store.state.visualizer.search.search);
		if (item === null) {
			item = GetEdge(this.condition.name, this.$store.state.visualizer.search.search);
			isNode = false;
		}
		if (item !== null) {
			if ( webcrap.misc.isNullOrWhitespace(item.label)) {
				this.alertMessage = this.$t('visualizer.search.error_no_selected_type_set').toString();
				this.saveable = false;
				this.showAlert = true;
			} else if ( isNode === false) {
				const edge = item as SearchEdge;
				if ((edge.min === 1 && edge.max === 1) === false) {
					this.alertMessage = this.$t('visualizer.search.multi_hop_cond_not_supported').toString();
					this.saveable = false;
					this.showAlert = true;
				}	
			}
			else {
				this.alertMessage = "";
				this.showAlert = false;
				this.saveable = true;
			}
		}
		else {
				this.alertMessage = this.$t('visualizer.search.error_getting_named_item').toString();
				this.showAlert = true;
				this.saveable = false;
			}
		this.selectedItem = item;

		//if selected item type has changed, properties need to be re-checked
		if (this.dataType === null) {
			this.condition.property = "";	
		}
		else if (webcrap.misc.isNullOrWhitespace(this.condition.property)) {
			this.condition.property = this.dataType.default;
		}
		else {
			if (this.dataType.propertyNames.includes(this.condition.property) === false) {
				this.condition.property = this.dataType.default;
			}
		}
	}

	updateAutocomplete(): void {
		let url: string;
		if (this.selectedItem.type === SearchItemType.SearchNode) {
			url =
				"/api/graph/node/values?type=" +
				this.selectedItem.label +
				"&property=" +
				this.condition.property +
				"&searchterm=" +
				this.condition.value;
		} else {
			url =
				"/api/graph/edge/values?type=" +
				this.selectedItem.label +
				"&property=" +
				this.condition.property +
				"&searchterm=" +
				this.condition.value;
		}
		
		const newrequest: Request = {
			url: url,
			successCallback: data => {
				//console.log(data);
				this.autocompleteList = data;
			},
			errorCallback: () => {
				//console.error(error);
				this.autocompleteList = [];
			},
		};
		api.get(newrequest);
	}

	onCloseClicked(): void {
		this.$store.commit(SearchStorePaths.mutations.CANCEL_CONDITION_EDIT);
	}

	onSaveClicked(): void {
		this.$store.commit(SearchStorePaths.mutations.Save.EDIT_VALUE_CONDITION, this.condition);
	}

	onDeleteClicked(): void {
		if (confirm(this.$t('confirm_value_condition_delete').toString())) {
			this.$store.commit(SearchStorePaths.mutations.Delete.EDIT_VALUE_CONDITION);
		}
	}
}
</script>