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
	<div v-if="cypherquery" class="dialogWrapper">
		<div id="shareDialog" class="dialog">
			<div class="share-block">
				<div>
					<b>{{ $t('phrase_Copy_and_paste_this_url') }}:</b>
				</div>
				<div class="share-code">
					<router-link :to="shareUrl">{{ sharedUrlDisplay }}</router-link>
				</div>
			</div>

			<div class="share-block">
				<div>
					<div>
						<b>{{ $t('phrase_Cypher_query') }}</b>
					</div>
					<div class="share-code">{{cypherquery}}</div>
				</div>
			</div>

			<div class="buttonrow">
				<button
					v-on:click="onShareOkClicked"
					class="button searchbutton-wide small"
					data-close
					:aria-label="$t('phrase_Close_dialog')"
					type="button"
				>
					<span aria-hidden="true">{{ $t('word_OK') }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
#shareDialog {
	font-size: 0.8em;
}

.share-block {
	padding-bottom: 1em;
}
</style>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { SearchStorePaths } from "@/store/modules/SearchStore";

@Component
export default class ShareDialog extends Vue {
	searchNotification = "";
	get cypherquery() {
		return this.$store.state.visualizer.search.shareCypher;
	}

	get sharedUrlDisplay(): string {
		return this.$route.path + this.shareUrl.substring(0, 40) + "....";
	}

	get shareUrl(): string {
		return this.$store.state.visualizer.search.shareUrl;
	}

	onShareOkClicked(): void {
		this.$store.commit(SearchStorePaths.mutations.Update.SHARE_CYPHER, "");
		this.$store.commit(SearchStorePaths.mutations.Update.SHARE_URL, "");
	}
}
</script>