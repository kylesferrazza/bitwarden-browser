import {
    Component,
    NgZone,
} from '@angular/core';

import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { SendView } from 'jslib/models/view/sendView';

import { SendComponent as BaseSendComponent } from 'jslib/angular/components/send/send.component';

import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { PolicyService } from 'jslib/abstractions/policy.service';
import { SearchService } from 'jslib/abstractions/search.service';
import { SendService } from 'jslib/abstractions/send.service';
import { StateService } from 'jslib/abstractions/state.service';
import { SyncService } from 'jslib/abstractions/sync.service';
import { UserService } from 'jslib/abstractions/user.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { PopupUtilsService } from '../services/popup-utils.service';

import { SendType } from 'jslib/enums/sendType';

const ComponentId = 'SendComponent';
const ScopeStateId = ComponentId + 'Scope';

@Component({
    selector: 'app-send-groupings',
    templateUrl: 'send-groupings.component.html',
})
export class SendGroupingsComponent extends BaseSendComponent {
    // Header
    showLeftHeader = true;
    // Send Type Calculations
    typeCounts = new Map<SendType, number>();
    // State Handling
    state: any;
    scopeState: any;
    private loadedTimeout: number;

    constructor(sendService: SendService, i18nService: I18nService,
        platformUtilsService: PlatformUtilsService, environmentService: EnvironmentService,
        broadcasterService: BroadcasterService, ngZone: NgZone, policyService: PolicyService,
        userService: UserService, searchService: SearchService,
        private popupUtils: PopupUtilsService, private stateService: StateService,
        private route: ActivatedRoute, private router: Router, private syncService: SyncService) {
        super(sendService, i18nService, platformUtilsService, environmentService, broadcasterService, ngZone,
            searchService, policyService, userService);
        super.onSuccessfulLoad = async () => {
            this.calculateTypeCounts();
        };
    }

    async ngOnInit() {
        // Determine Header details
        this.showLeftHeader = !(this.popupUtils.inSidebar(window) && this.platformUtilsService.isFirefox());
        // Let super class finish
        await super.ngOnInit();
        // Handle State Restore if necessary
        const restoredScopeState = await this.restoreState();
        this.state = (await this.stateService.get<any>(ComponentId)) || {};
        if (this.state.searchText != null) {
            this.searchText = this.state.searchText;
        }

        if (!this.syncService.syncInProgress) {
            this.load();
        } else {
            this.loadedTimeout = window.setTimeout(() => {
                if (!this.loaded) {
                    this.load();
                }
            }, 5000);
        }

        if (!this.syncService.syncInProgress || restoredScopeState) {
            window.setTimeout(() => this.popupUtils.setContentScrollY(window, this.state.scrollY), 0);
        }
    }

    ngOnDestroy() {
        // Remove timeout
        if (this.loadedTimeout != null) {
            window.clearTimeout(this.loadedTimeout);
        }
        // Save state
        this.saveState();
        // Allow super to finish
        super.ngOnDestroy();
    }

    async selectType(type: SendType) {
        // TODO this.router.navigate(['/send-type-list'], { queryParams: { type: type } });
    }

    async selectSend(s: SendView) {
        // TODO -> Route to edit send
    }

    async addSend() {
        // TODO -> Route to create send
    }

    showSearching() {
        return this.hasSearched || (!this.searchPending && this.searchService.isSearchable(this.searchText));
    }

    private calculateTypeCounts() {
        // Create type counts
        const typeCounts = new Map<SendType, number>();
        this.sends.forEach((s) => {
            if (typeCounts.has(s.type)) {
                typeCounts.set(s.type, typeCounts.get(s.type) + 1);
            } else {
                typeCounts.set(s.type, 1);
            }
        });
        this.typeCounts = typeCounts;
    }

    private async saveState() {
        this.state = {
            scrollY: this.popupUtils.getContentScrollY(window),
            searchText: this.searchText,
        };
        await this.stateService.save(ComponentId, this.state);

        this.scopeState = {
            sends: this.sends,
            typeCounts: this.typeCounts,
        };
        await this.stateService.save(ScopeStateId, this.scopeState);
    }

    private async restoreState(): Promise<boolean> {
        this.scopeState = await this.stateService.get<any>(ScopeStateId);
        if (this.scopeState == null) {
            return false;
        }

        if (this.scopeState.sends != null) {
            this.sends = this.scopeState.sends;
        }
        if (this.scopeState.typeCounts != null) {
            this.typeCounts = this.scopeState.typeCounts;
        }

        return true;
    }
}
